import { http, HttpResponse } from 'msw';
import { createMockUser, createMockReview, createMockGame, createMockActivity, createMockComment } from '../factories';

// Minimal delay for performance (reduced from previous values)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Import optimized fixtures
import { getFranchiseInfo, generateMockGames } from '../fast-mocks';
import { SHARED_FIXTURES } from '../shared-fixtures';

// Franchise data for consistent testing
const FRANCHISE_DATA: Record<string, string[]> = {
  'mario': [
    'Super Mario Bros.', 'Super Mario World', 'Super Mario 64', 
    'Super Mario Odyssey', 'Mario Kart 8 Deluxe', 'Paper Mario',
    'Mario Party Superstars', "Luigi's Mansion 3", "Yoshi's Island",
    'Super Mario Galaxy', 'Mario Tennis Aces', 'Mario Golf: Super Rush',
    'Super Mario 3D World', 'New Super Mario Bros. U', 'Super Mario Maker 2',
    'Mario & Luigi: Superstar Saga', 'Super Mario Sunshine', 'Mario Strikers',
    'Dr. Mario', 'Mario Paint', 'Super Mario RPG', 'Mario vs. Donkey Kong',
    'Super Mario Land', 'Super Mario Land 2', 'Super Mario Bros. 2',
    'Super Mario Bros. 3', 'Super Mario All-Stars', 'Mario Kart 64',
    'Mario Kart: Double Dash!!', 'Mario Kart Wii', 'Mario Kart 7',
    'Mario Kart Tour', 'Mario Party', 'Mario Party 2', 'Mario Party 3',
    'Mario Party 4', 'Mario Party 5', 'Mario Party 6', 'Mario Party 7',
    'Mario Party 8', 'Mario Party 9', 'Mario Party 10', 'Mario Tennis',
    'Mario Tennis Open', 'Mario Golf', 'Mario Superstar Baseball',
    'Super Mario 3D Land', 'Captain Toad: Treasure Tracker', 'Donkey Kong',
    'Mario Bros.', 'Wrecking Crew', 'Mario Clash', 'Mario Hoops 3-on-3'
  ],
  'zelda': [
    'The Legend of Zelda: Breath of the Wild', 'The Legend of Zelda: Tears of the Kingdom',
    'The Legend of Zelda: Ocarina of Time', "The Legend of Zelda: Majora's Mask",
    'The Legend of Zelda: Wind Waker', "The Legend of Zelda: Link's Awakening",
    'The Legend of Zelda: A Link to the Past', 'The Legend of Zelda: Twilight Princess',
    'The Legend of Zelda: Skyward Sword', 'The Legend of Zelda',
    'Zelda II: The Adventure of Link', 'The Legend of Zelda: A Link Between Worlds',
    'The Legend of Zelda: Tri Force Heroes', 'The Legend of Zelda: Spirit Tracks',
    'The Legend of Zelda: Phantom Hourglass', 'The Legend of Zelda: Four Swords',
    'The Legend of Zelda: Oracle of Ages', 'The Legend of Zelda: Oracle of Seasons'
  ],
  'pokemon': [
    'Pokemon Red', 'Pokemon Blue', 'Pokemon Yellow', 'Pokemon Gold',
    'Pokemon Silver', 'Pokemon Crystal', 'Pokemon Sword', 'Pokemon Shield',
    'Pokemon Ruby', 'Pokemon Sapphire', 'Pokemon Emerald', 'Pokemon Diamond',
    'Pokemon Pearl', 'Pokemon Platinum', 'Pokemon Black', 'Pokemon White',
    'Pokemon Black 2', 'Pokemon White 2', 'Pokemon X', 'Pokemon Y',
    'Pokemon Sun', 'Pokemon Moon', 'Pokemon Ultra Sun', 'Pokemon Ultra Moon',
    'Pokemon Legends: Arceus', 'Pokemon Scarlet', 'Pokemon Violet',
    'Pokemon Let\'s Go Pikachu', 'Pokemon Let\'s Go Eevee'
  ],
  'mega man': [
    'Mega Man', 'Mega Man 2', 'Mega Man 3', 'Mega Man 4', 'Mega Man 5',
    'Mega Man 6', 'Mega Man 7', 'Mega Man 8', 'Mega Man 9', 'Mega Man 10',
    'Mega Man 11', 'Mega Man X', 'Mega Man X2', 'Mega Man X3', 'Mega Man X4',
    'Mega Man Zero', 'Mega Man ZX', 'Mega Man Legends', 'Mega Man Battle Network'
  ],
  'metal gear': [
    'Metal Gear', 'Metal Gear 2: Solid Snake', 'Metal Gear Solid',
    'Metal Gear Solid 2', 'Metal Gear Solid 3', 'Metal Gear Solid 4',
    'Metal Gear Solid V', 'Metal Gear Rising: Revengeance'
  ]
};

// Optimized game generation using fast-mocks
function generateGamesForQuery(query: string, limit: number): any[] {
  // Use optimized franchise lookup
  const franchiseInfo = getFranchiseInfo(query);
  const actualCount = Math.min(limit, franchiseInfo.count);
  
  // Use fast mock generator instead of complex object creation
  return generateMockGames(actualCount, query.charAt(0).toUpperCase() + query.slice(1));
}

export const handlers = [
  // ============================================
  // OPTIONS Preflight - Handle CORS
  // ============================================
  http.options('*', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, prefer',
        'Access-Control-Max-Age': '86400'
      }
    });
  }),

  // ============================================
  // Supabase RPC - Search Games (Universal)
  // ============================================
  http.post('*/rest/v1/rpc/search_games_secure', async ({ request }) => {
    console.log('🎯 MSW: Intercepting search_games_secure');
    // No delay for maximum speed
    
    const body = await request.json() as any;
    const { search_query = '', limit_count = 50 } = body;
    
    // Use optimized game generation
    const games = generateGamesForQuery(search_query, limit_count);
    
    // Pre-compute search results efficiently  
    const searchResults = games.map((game, index) => ({
      id: game.id,
      search_rank: 1.0 - (index * 0.01)
    }));
    
    console.log(`🎯 MSW: Returning ${searchResults.length} search results for "${search_query}"`);
    return HttpResponse.json(searchResults, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }),

  // ============================================
  // Supabase Game Table (Universal)
  // ============================================
  http.get('*/rest/v1/game*', async ({ request }) => {
    console.log('🎯 MSW: Intercepting game table query');
    // No delay for table queries
    
    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');
    
    // Handle ID-based queries
    if (idFilter && idFilter.startsWith('in.')) {
      // Extract IDs from filter (format: "in.(1,2,3,4)")
      const idsString = idFilter.replace('in.(', '').replace(')', '');
      const ids = idsString.split(',').map(id => parseInt(id.trim()));
      
      // Generate games for requested IDs  
      const games = ids.map(id => {
        const queryChar = String.fromCharCode(Math.floor(id / 1000));
        const gameIndex = id % 1000;
        
        const franchiseNames = Object.keys(FRANCHISE_DATA);
        let query = 'unknown';
        let gameNames = ['Generic Game'];
        let developer = 'Unknown';
        
        // Find franchise by first character
        for (const franchise of franchiseNames) {
          if (franchise.toLowerCase().startsWith(queryChar)) {
            query = franchise;
            gameNames = FRANCHISE_DATA[franchise];
            developer = franchise === 'pokemon' ? 'Game Freak' : 
                        franchise === 'mega man' ? 'Capcom' :
                        franchise === 'metal gear' ? 'Konami' : 'Nintendo';
            break;
          }
        }
        
        const gameName = gameNames[gameIndex % gameNames.length];
        
        return createMockGame({
          id,
          igdb_id: id + 10000,
          name: gameName,
          developer,
          category: 0,
          summary: `${gameName} is a critically acclaimed game.`,
          description: `${gameName} is a critically acclaimed game.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
      
      console.log(`🎯 MSW: Returning ${games.length} games for ID query`);
      return HttpResponse.json({ data: games, error: null });
    }

    // Handle text-based search queries (ilike patterns)
    const orFilter = url.searchParams.get('or');
    if (orFilter) {
      // Extract search term from OR filter pattern
      const match = orFilter.match(/name\.ilike\.%25([^%]+)%25/);
      if (match) {
        const searchTerm = match[1].replace(/\+/g, ' ');
        const games = generateGamesForQuery(searchTerm, 50);
        console.log(`🎯 MSW: Returning ${games.length} games for text search "${searchTerm}"`);
        return HttpResponse.json({ data: games, error: null });
      }
    }
    
    // Default fallback - return empty result
    console.log('🎯 MSW: No matching query pattern, returning empty result');
    return HttpResponse.json({ data: [], error: null });
  }),

  // ============================================
  // Basic Supabase Operations
  // ============================================
  
  // Auth endpoints
  http.post('*/auth/v1/token', async () => {
    await delay(100);
    return HttpResponse.json({
      access_token: 'mock-token',
      user: { id: 'test-user', email: 'test@example.com' }
    });
  }),

  http.get('*/auth/v1/user', async ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth?.includes('Bearer')) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ id: 'test-user', email: 'test@example.com' });
  }),

  // User table
  http.get('*/rest/v1/user', async () => {
    return HttpResponse.json([createMockUser({ id: 1 })]);
  }),

  http.post('*/rest/v1/user', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockUser({ ...body, id: 1 }));
  }),

  // Reviews (rating table)
  http.get('*/rest/v1/rating', async () => {
    const reviews = Array.from({ length: 5 }, (_, i) => createMockReview({ id: i + 1 }));
    return HttpResponse.json(reviews);
  }),

  http.post('*/rest/v1/rating', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockReview({ ...body, id: Math.random() }));
  }),

  // Comments
  http.get('*/rest/v1/comment', async () => {
    const comments = Array.from({ length: 3 }, (_, i) => createMockComment({ id: i + 1 }));
    return HttpResponse.json(comments);
  }),

  // Activities
  http.get('*/rest/v1/activities', async () => {
    const activities = Array.from({ length: 10 }, (_, i) => createMockActivity({ id: i + 1 }));
    return HttpResponse.json(activities);
  }),

  // IGDB proxy fallbacks
  http.post('*/.netlify/functions/igdb-search', async ({ request }) => {
    const body = await request.json() as any;
    const { searchTerm = '', limit = 10 } = body;
    
    const games = generateGamesForQuery(searchTerm, limit);
    return HttpResponse.json({
      games,
      totalCount: Math.min(games.length * 2, 100),
      hasMore: games.length >= limit
    });
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn('🚨 MSW: Unhandled request:', request.method, request.url);
    return new HttpResponse(null, { status: 404 });
  })
];