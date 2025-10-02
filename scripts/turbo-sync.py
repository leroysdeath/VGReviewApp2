#!/usr/bin/env python3
"""
Turbo Game Sync - Maximum speed IGDB sync
Requires: pip install aiohttp asyncpg python-dotenv
"""

import asyncio
import asyncpg
import aiohttp
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
IGDB_CLIENT_ID = os.getenv('TWITCH_CLIENT_ID')
IGDB_TOKEN = os.getenv('TWITCH_APP_ACCESS_TOKEN')

# Extract database connection from Supabase URL
import re
db_match = re.search(r'https://([^.]+)\.supabase\.co', SUPABASE_URL)
if db_match:
    DB_HOST = f"{db_match.group(1)}.supabase.co"
    DB_NAME = "postgres"
    DB_USER = "postgres"
    DB_PASSWORD = os.getenv('SUPABASE_DB_PASSWORD')  # You'll need to add this
    DB_PORT = 5432

# Aggressive settings
PARALLEL_IGDB_REQUESTS = 20  # IGDB can handle this in burst
BATCH_SIZE = 500  # Max per IGDB request
DB_POOL_SIZE = 20  # Database connection pool
CHUNK_SIZE = 5000  # Process 5000 games at once


class TurboGameSync:
    def __init__(self):
        self.session = None
        self.db_pool = None
        self.stats = {
            'total': 0,
            'processed': 0,
            'updated': 0,
            'failed': 0,
            'start_time': datetime.now()
        }

    async def init(self):
        """Initialize connections"""
        self.session = aiohttp.ClientSession()
        self.db_pool = await asyncpg.create_pool(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            min_size=10,
            max_size=DB_POOL_SIZE,
            command_timeout=60
        )

    async def close(self):
        """Cleanup connections"""
        await self.session.close()
        await self.db_pool.close()

    async def fetch_igdb_batch(self, igdb_ids: List[int]) -> List[Dict]:
        """Fetch batch from IGDB"""
        query = f"""
        fields name,summary,cover.url,first_release_date,
               platforms.name,involved_companies.company.name,
               involved_companies.developer,involved_companies.publisher,
               screenshots.url,aggregated_rating,total_rating,
               total_rating_count,franchises.name,collections.name,
               alternative_names.name,similar_games,dlcs,expansions,
               category,parent_game;
        where id = ({','.join(map(str, igdb_ids))});
        limit {BATCH_SIZE};
        """

        headers = {
            'Client-ID': IGDB_CLIENT_ID,
            'Authorization': f'Bearer {IGDB_TOKEN}'
        }

        async with self.session.post(
            'https://api.igdb.com/v4/games',
            headers=headers,
            data=query
        ) as response:
            if response.status == 200:
                return await response.json()
            else:
                print(f"IGDB error: {response.status}")
                return []

    def transform_game(self, igdb_data: Dict) -> Dict:
        """Transform IGDB data to our schema"""
        transformed = {
            'igdb_id': igdb_data['id'],
            'summary': igdb_data.get('summary'),
            'release_date': datetime.fromtimestamp(
                igdb_data['first_release_date']
            ).date() if igdb_data.get('first_release_date') else None,
            'cover_url': igdb_data.get('cover', {}).get('url', '').replace(
                '//images.igdb.com', 'https://images.igdb.com'
            ).replace('t_thumb', 't_1080p') or None,
            'platforms': [p['name'] for p in igdb_data.get('platforms', [])],
            'screenshots': [
                s['url'].replace('//images.igdb.com', 'https://images.igdb.com')
                .replace('t_thumb', 't_1080p')
                for s in igdb_data.get('screenshots', [])
            ],
            'total_rating': round(igdb_data.get('total_rating', 0)),
            'rating_count': igdb_data.get('total_rating_count', 0),
            'metacritic_score': round(igdb_data.get('aggregated_rating', 0)),
            'franchise_name': igdb_data.get('franchises', [{}])[0].get('name'),
            'collection_name': igdb_data.get('collections', [{}])[0].get('name'),
            'alternative_names': [a['name'] for a in igdb_data.get('alternative_names', [])],
            'similar_game_ids': igdb_data.get('similar_games', []),
            'dlc_ids': igdb_data.get('dlcs', []),
            'expansion_ids': igdb_data.get('expansions', []),
            'category': igdb_data.get('category'),
            'parent_game': igdb_data.get('parent_game')
        }

        # Extract developer/publisher
        companies = igdb_data.get('involved_companies', [])
        for company in companies:
            if company.get('developer'):
                transformed['developer'] = company.get('company', {}).get('name')
            if company.get('publisher'):
                transformed['publisher'] = company.get('company', {}).get('name')

        return transformed

    async def bulk_update_database(self, games: List[Dict]):
        """Ultra-fast bulk database update using COPY"""
        async with self.db_pool.acquire() as conn:
            # Create temp table
            await conn.execute("""
                CREATE TEMP TABLE temp_game_updates (
                    igdb_id INTEGER,
                    data JSONB
                )
            """)

            # Bulk insert using COPY
            records = [(g['igdb_id'], json.dumps(g)) for g in games]
            await conn.copy_records_to_table(
                'temp_game_updates',
                records=records,
                columns=['igdb_id', 'data']
            )

            # Single UPDATE from temp table
            result = await conn.execute("""
                UPDATE game g
                SET
                    summary = COALESCE(g.summary, (t.data->>'summary')::TEXT),
                    cover_url = COALESCE(g.cover_url, (t.data->>'cover_url')::TEXT),
                    release_date = COALESCE(g.release_date, (t.data->>'release_date')::DATE),
                    developer = COALESCE(g.developer, (t.data->>'developer')::TEXT),
                    publisher = COALESCE(g.publisher, (t.data->>'publisher')::TEXT),
                    platforms = COALESCE(
                        CASE WHEN array_length(g.platforms, 1) > 0 THEN g.platforms ELSE NULL END,
                        ARRAY(SELECT jsonb_array_elements_text(t.data->'platforms'))
                    ),
                    screenshots = COALESCE(
                        CASE WHEN array_length(g.screenshots, 1) > 0 THEN g.screenshots ELSE NULL END,
                        ARRAY(SELECT jsonb_array_elements_text(t.data->'screenshots'))
                    ),
                    total_rating = COALESCE(g.total_rating, (t.data->>'total_rating')::INTEGER),
                    rating_count = GREATEST(g.rating_count, COALESCE((t.data->>'rating_count')::INTEGER, 0)),
                    metacritic_score = (t.data->>'metacritic_score')::INTEGER,
                    franchise_name = COALESCE(g.franchise_name, (t.data->>'franchise_name')::TEXT),
                    collection_name = COALESCE(g.collection_name, (t.data->>'collection_name')::TEXT),
                    alternative_names = ARRAY(SELECT jsonb_array_elements_text(t.data->'alternative_names')),
                    category = COALESCE(g.category, (t.data->>'category')::INTEGER),
                    parent_game = COALESCE(g.parent_game, (t.data->>'parent_game')::INTEGER),
                    last_synced = NOW(),
                    data_source = 'turbo_sync'
                FROM temp_game_updates t
                WHERE g.igdb_id = t.igdb_id
            """)

            # Get update count
            updated = int(result.split()[-1])
            self.stats['updated'] += updated

            # Drop temp table
            await conn.execute("DROP TABLE temp_game_updates")

    async def process_chunk(self, games: List[Dict]):
        """Process a chunk of games"""
        igdb_ids = [g['igdb_id'] for g in games if g['igdb_id']]
        if not igdb_ids:
            return

        # Split into IGDB request batches
        batches = [igdb_ids[i:i+BATCH_SIZE] for i in range(0, len(igdb_ids), BATCH_SIZE)]

        # Fetch all batches in parallel
        tasks = [self.fetch_igdb_batch(batch) for batch in batches]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten and transform results
        all_games = []
        for result in results:
            if isinstance(result, list):
                all_games.extend([self.transform_game(g) for g in result])

        if all_games:
            await self.bulk_update_database(all_games)

        self.stats['processed'] += len(games)

    async def run(self):
        """Main sync process"""
        print("🚀 TURBO SYNC INITIATED")

        # Get all games needing sync
        async with self.db_pool.acquire() as conn:
            games = await conn.fetch("""
                SELECT id, game_id, igdb_id, name
                FROM game
                WHERE igdb_id IS NOT NULL
                AND (
                    cover_url IS NULL OR
                    summary IS NULL OR
                    developer IS NULL OR
                    release_date IS NULL OR
                    last_synced IS NULL
                )
                ORDER BY rating_count DESC NULLS LAST
            """)

        self.stats['total'] = len(games)
        print(f"Found {self.stats['total']} games to sync")

        # Process in chunks
        chunks = [games[i:i+CHUNK_SIZE] for i in range(0, len(games), CHUNK_SIZE)]

        for i, chunk in enumerate(chunks):
            # Process chunk with max parallelism
            sub_chunks = [chunk[j:j+BATCH_SIZE] for j in range(0, len(chunk), BATCH_SIZE)]
            tasks = [self.process_chunk(sc) for sc in sub_chunks[:PARALLEL_IGDB_REQUESTS]]

            await asyncio.gather(*tasks, return_exceptions=True)

            # Progress update
            elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
            rate = self.stats['processed'] / elapsed if elapsed > 0 else 0
            pct = (self.stats['processed'] / self.stats['total'] * 100) if self.stats['total'] > 0 else 0

            print(f"Progress: {self.stats['processed']}/{self.stats['total']} "
                  f"({pct:.1f}%) | Rate: {rate:.0f}/sec | "
                  f"Updated: {self.stats['updated']}")

        # Final stats
        elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
        print(f"\n✅ SYNC COMPLETE in {elapsed:.0f} seconds")
        print(f"Updated: {self.stats['updated']} games")
        print(f"Rate: {self.stats['total']/elapsed:.0f} games/second")


async def main():
    sync = TurboGameSync()
    await sync.init()
    try:
        await sync.run()
    finally:
        await sync.close()


if __name__ == "__main__":
    asyncio.run(main())