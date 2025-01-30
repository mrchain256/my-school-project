import asyncio
import json
import math
import random
import logging
import datetime
from typing import List, Dict
import aiohttp

class LazadaScraper:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.session = None

    async def get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None

    async def scrape_products(self, query: str) -> List[Dict]:
        try:
            tag_query = query.replace(" ", "-")
            encoded_query = query.replace(" ", "%20")
            
            headers = {
                "accept": "application/json, text/plain, */*",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "bx-v": "2.5.28",
                "cookie": "lzd_cid=b54f0fb5-a66e-4634-a34b-ad096bc5578b; t_fv=1737981433339; t_uid=A2canUdzeHtr2dsA23CDYyqFN67qfuGU; hng=ID|id|IDR|360; userLanguageML=id; lwrid=AgGUp8QZNAvVxV0vTR%2FqX39uIynw; cna=+2seIFdJv34CASRU7EfY74gq; xlly_s=1; lzd_sid=16aad5d3fe37880a386b04f73f108538; _tb_token_=ee758b5d67873; t_sid=Rh1AHcuEvGIOl2d1obHzWeAXUM79HLLA; utm_origin=https://www.google.com/; utm_channel=SEO; _m_h5_tk=6fd7ac2320eea734a88f2e0cede8ebc2_1738055299958; _m_h5_tk_enc=a843851795f4366e9f8174ccdfff807c; lwrtk=AAEEZ5jnpY6py36vcC+ENwyBnCsi9pE1WbvFVM3Fdhdh1pI/Q1snFgU=; epssw=7*v6Yss6zJN6TyCassvG1s6ssKs0EjXShMs6KZDJNTPzoJCwWonBQC2XQ8g21csG8Ws3ss63iMkBDsssssT21sEsuSGcKsThm1wwQDAgmh5uol4qNbssInvGbgdOloSoBJsu_aA5EXJnxZlr8hDnMj8XMc8qZsZZt7p8C_rF421GeRIJsDOFIt6sgLOXQJnieKCi1hBPjuOeSGR_UsO6-dBRQOOW5KliOO7yVzCD6Z3xFVugdyfnaLxgmktSEh1x5TiWbsssuT86duLvCXX_Xvp7yssRrb3s-bbUssjdZhszfkWv28vL6sisuU3kBhPs0c3ABhhszY76..; tfstk=fS1StqVKJ0mWl7v-QwU2fiK_f2OQ7gNww2TdSwhrJQd-vDQ90BzoL8YBOnsH4pBzxiTdYGx-4z2uReIkc3WFywRBJgSDLbRROtcCSwfzrBzkZaAH9lra_B_lrBvwdgdY0ZUp-SUNEVVNra0xPDUNH5oI8aHEOHIpendvrnn-2MLJDrTp80HKwMQvz3kUAVllkoGxGYwUzSVzRfhOGUUkXatXoEfXPLt9EnGd7sTWFhQ5aOxzSECVGdJq8rdAStSJlCNSjU6A5QLCtPHBAp1kGe60VYS1qeQvhgzEKE6CJ1Ak12FRlQtWBspuOPjOlwBwhszTsQOJ29Rl8VZPl_sPrs_EJxdWat91NCIzqf-_I-MIldcBlhzblvDh47yKth2A-RvJoE5alriSKLLDlhzblvDHeEY2QrajVvf..",  # Keep your full cookie
                "priority": "u=1, i",
                "referer": "https://www.lazada.co.id/",
                "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
                "x-csrf-token": "ee758b5d67873",
            }

            session = await self.get_session()

            # Get total pages from initial request
            initial_url = f"https://www.lazada.co.id/tag/{tag_query}/?ajax=true&catalog_redirect_tag=true&isFirstRequest=true&page=1&q={encoded_query}"
            async with session.get(initial_url, headers=headers) as response:
                if response.status != 200:
                    self.logger.error(f"Failed to fetch initial page: {response.status}")
                    return []
                data = await response.json()
                main_info = data.get('mainInfo', {})
                total_results = int(main_info.get('totalResults', 0))
                page_size = int(main_info.get('pageSize', 40))
                total_pages = math.ceil(total_results / page_size) if total_results and page_size else 0

            if total_pages == 0:
                self.logger.error("No pages found")
                return []

            self.logger.info(f"Total products: {total_results}, pages: {total_pages}")
            products = []

            for page in range(1, total_pages + 1):
                page_url = f"https://www.lazada.co.id/tag/{tag_query}/?ajax=true&catalog_redirect_tag=true&isFirstRequest=true&page={page}&q={encoded_query}"
                # self.logger.info(f"Scraping page {page}/{total_pages}")

                async with session.get(page_url, headers=headers) as response:
                    if response.status != 200:
                        self.logger.error(f"Failed to fetch page {page}: {response.status}")
                        continue

                    data = await response.json()
                    items = data.get('mods', {}).get('listItems', [])

                    for item in items:
                        try:
                            # Extract and clean price
                            price_str = item.get('priceShow', 'Rp0').replace('Rp', '').replace('.', '').strip()
                            price = float(price_str)
                            
                            product = {
                                'name': item.get('name', ''),
                                'price': price,
                                'platform': 'Lazada',
                                'price_history': [{
                                    'date': datetime.datetime.utcnow().isoformat(),
                                    'price': price
                                }],
                                'current_price': price
                            }
                            products.append(product)
                        except (ValueError, KeyError) as e:
                            self.logger.error(f"Error processing item: {str(e)}")
                            continue

                    # Random delay between 3-5 seconds
                    # await asyncio.sleep(random.uniform(3, 5))

            return products

        except Exception as e:
            self.logger.error(f"Error scraping Lazada: {str(e)}")
            return []