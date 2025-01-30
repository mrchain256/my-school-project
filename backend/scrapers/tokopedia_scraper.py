from typing import List, Dict
import logging
import aiohttp
from datetime import datetime

class TokopediaScraper:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.session = None
        self.headers = {
            "authority": "gql.tokopedia.com",
            "method": "POST",
            "path": "/graphql/SearchProductV5Query",
            "scheme": "https",
            "accept": "*/*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "content-type": "application/json",
            "cookie": "...",  # shortened for brevity
            "origin": "https://www.tokopedia.com",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }

    async def get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None

    async def scrape_products(self, query: str) -> List[Dict]:
        url = "https://gql.tokopedia.com/graphql/SearchProductV5Query"
        initial_params = f"device=desktop&l_name=sre&navsource=&ob=23&page=1&q={query}&related=true&rows=60&safe_search=false&scheme=https&shipping=&show_adult=false&source=search&srp_component_id=02.01.00.00&srp_page_id=&srp_page_title=&st=product&start=0&topads_bucket=true&unique_id=f9c249c32eaae86b1153f8f041495af5&user_id=256233361&variants="
        
        # Parse initial_params into a dictionary
        params_dict = {}
        for pair in initial_params.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                params_dict[key] = value
        
        rows = int(params_dict.get('rows', 60))
        page = 1
        total_pages = 1  # Default to 1, will update after first request
        result = []
        
        session = await self.get_session()
        
        while page <= total_pages:
            # Update page and start in params_dict
            params_dict['page'] = str(page)
            start = (page - 1) * rows
            params_dict['start'] = str(start)
            
            # Rebuild params string
            new_params = '&'.join([f"{k}={v}" for k, v in params_dict.items()])
            
            # Create payload for current page
            payload = [{
                "operationName": "SearchProductV5Query",
                "variables": {
                    "params": new_params
                },
                "query": "query SearchProductV5Query($params: String!) {\n  searchProductV5(params: $params) {\n    header {\n      totalData\n      responseCode\n      keywordProcess\n      keywordIntention\n      componentID\n      isQuerySafe\n      additionalParams\n      backendFilters\n      __typename\n    }\n    data {\n      totalDataText\n      products {\n        id\n        name\n        url\n        price {\n          text\n          number\n          original\n          discountPercentage\n          __typename\n        }\n        shop {\n          name\n          city\n          __typename\n        }\n        rating\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
            }]
            
            try:
                async with session.post(url, headers=self.headers, json=payload) as response:
                    if response.status != 200:
                        self.logger.error(f"Tokopedia API error: {response.status} on page {page}")
                        break  # Exit loop on HTTP error
                    
                    data = await response.json()
                    try:
                        search_data = data[0]['data']['searchProductV5']
                        header = search_data['header']
                        products_batch = search_data['data']['products']
                    except (KeyError, IndexError):
                        self.logger.error("Invalid response structure from Tokopedia")
                        break  # Exit loop on structural error
                    
                    # Update total_pages based on first response
                    if page == 1:
                        total_data = header.get('totalData', 0)
                        total_pages = (total_data + rows - 1) // rows  # Ceiling division
                        self.logger.info(f"Total products: {total_data}, pages: {total_pages}")
                    
                    # Break loop if no products returned
                    if not products_batch:
                        self.logger.info("No more products found.")
                        break
                    
                    # Process products
                    for product in products_batch:
                        try:
                            price = float(product['price']['number'])
                            product_data = {
                                'name': product.get('name', ''),
                                'price': price,
                                'url': product.get('url', ''),
                                'platform': 'Tokopedia',
                                'price_history': [{
                                    'date': datetime.utcnow().isoformat(),
                                    'price': price
                                }],
                                'current_price': price
                            }
                            result.append(product_data)
                        except (ValueError, KeyError) as e:
                            self.logger.error(f"Error processing product: {str(e)}")
                            continue
                    
                    page += 1  # Move to next page
            
            except Exception as e:
                self.logger.error(f"Error scraping page {page}: {str(e)}")
                break  # Exit loop on exception
        
        return result