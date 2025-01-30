from abc import ABC, abstractmethod
from typing import List, Dict
import logging
import aiohttp
from datetime import datetime

class BaseScraper(ABC):
    def __init__(self):
        self.session = None
        self.logger = logging.getLogger(self.__class__.__name__)

    async def get_session(self) -> aiohttp.ClientSession:   
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    @abstractmethod
    async def scrape_products(self, query: str) -> List[Dict]:
        pass

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    def format_product_data(self, raw_data: Dict, platform: str) -> Dict:
        return {
            'name': raw_data.get('name', ''),
            'current_price': float(raw_data.get('price', 0)),
            'platform': platform,
            'url': raw_data.get('url', ''),
            'price_history': [
                {'date': datetime.utcnow(), 'price': float(raw_data.get('price', 0))}
            ]
        }