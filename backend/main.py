from fastapi import FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import uvicorn
from datetime import datetime
import asyncio
import logging
from pydantic import BaseModel
from scrapers.tokopedia_scraper import TokopediaScraper
from scrapers.lazada_scraper import LazadaScraper

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProductStore:
    def __init__(self):
        self.products: List[Dict] = []
        self._counter = 0

    def add_products(self, products: List[Dict]) -> List[str]:
        product_ids = []
        for product in products:
            self._counter += 1
            product_id = str(self._counter)
            product['id'] = product_id
            self.products.append(product)
            product_ids.append(product_id)
        return product_ids

    def get_products(self) -> List[Dict]:
        return self.products

    def get_products_by_platform(self, platform: str) -> List[Dict]:
        return [p for p in self.products if p['platform'].lower() == platform.lower()]

store = ProductStore()

class TrackProductResponse(BaseModel):
    message: str
    product_ids: List[str]
    total_products: int

@app.post("/track-product", response_model=TrackProductResponse)
async def track_product(product_name: str = Form(...)):
    logger.info(f"Tracking product: {product_name}")
    
    # Initialize scrapers
    tokopedia_scraper = TokopediaScraper()
    lazada_scraper = LazadaScraper()
    
    try:
        # Run both scrapers concurrently
        results = await asyncio.gather(
            tokopedia_scraper.scrape_products(product_name),
            lazada_scraper.scrape_products(product_name),
            return_exceptions=True
        )
        
        all_products = []
        for result in results:
            if isinstance(result, list):
                all_products.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Scraping error: {str(result)}")
            
        if not all_products:
            raise HTTPException(status_code=404, detail=f"No products found for: {product_name}")
        
        product_ids = store.add_products(all_products)
        
        response_data = TrackProductResponse(
            message="Products tracked successfully",
            product_ids=product_ids,
            total_products=len(product_ids)
        )
        logger.info(f"Successfully tracked {len(product_ids)} products")
        return response_data
    
    except Exception as e:
        logger.error(f"Error tracking products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        try:
            await asyncio.gather(
                tokopedia_scraper.close(),
                lazada_scraper.close()
            )
        except Exception as e:
            logger.error(f"Error closing scraper sessions: {str(e)}")

@app.get("/products")
async def get_products():
    products = store.get_products()
    return [
        {
            "id": product["id"],
            "name": product["name"],
            "platform": product["platform"],
            "currentPrice": float(product["price"]),  # Ensure price is a number
            "priceHistory": product["price_history"],
            "url": product.get("url", ""),  # Include product URL
        }
        for product in products
    ]

@app.get("/products/{platform}")
async def get_products_by_platform(platform: str):
    products = store.get_products_by_platform(platform)
    if not products:
        raise HTTPException(status_code=404, detail=f"No products found for platform: {platform}")
    return products

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)