import { http, HttpResponse } from 'msw';
import { createMockUser, createMockReview, createMockGame, createMockActivity, createMockComment } from '../factories';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const handlers = [
  // ============================================
  // Supabase Auth Endpoints
  // ============================================
  
  // Login
  http.post('*/auth/v1/token', async () => {
    await delay(100); // Simulate network delay
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Test User' },
      }
    });
  }),

  // Get current user
  http.get('*/auth/v1/user', async ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.includes('Bearer')) {
      return new HttpResponse(null, { status: 401 });
    }
    
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // Logout
  http.post('*/auth/v1/logout', async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Supabase Database - User
  // ============================================
  
  // Get user by provider_id
  http.get('*/rest/v1/user', async ({ request }) => {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('provider_id');
    
    if (providerId === 'eq.test-user-id') {
      return HttpResponse.json([createMockUser({
        id: 1,
        provider_id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
      })]);
    }
    
    return HttpResponse.json([]);
  }),

  // Create user
  http.post('*/rest/v1/user', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockUser({
      ...body,
      id: 1,
      created_at: new Date().toISOString(),
    }));
  }),

  // Update user
  http.patch('*/rest/v1/user', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json([createMockUser({
      ...body,
      updated_at: new Date().toISOString(),
    })]);
  }),

  // ============================================
  // Supabase Database - Reviews (rating table)
  // ============================================
  
  // Get reviews
  http.get('*/rest/v1/rating', async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const gameId = url.searchParams.get('game_id');
    
    // Generate mock reviews based on query
    const reviews = Array.from({ length: 5 }, (_, i) => 
      createMockReview({
        id: i + 1,
        user_id: userId ? parseInt(userId.replace('eq.', '')) : i + 1,
        game_id: gameId ? parseInt(gameId.replace('eq.', '')) : i + 100,
      })
    );
    
    return HttpResponse.json(reviews);
  }),

  // Create review
  http.post('*/rest/v1/rating', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockReview({
      ...body,
      id: Math.floor(Math.random() * 1000),
      post_date_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
  }),

  // Update review
  http.patch('*/rest/v1/rating', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json([createMockReview({
      ...body,
      updated_at: new Date().toISOString(),
    })]);
  }),

  // Delete review
  http.delete('*/rest/v1/rating', async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Supabase Database - Games
  // ============================================
  
  // Get games
  http.get('*/rest/v1/game', async ({ request }) => {
    const url = new URL(request.url);
    const igdbId = url.searchParams.get('igdb_id');
    
    if (igdbId) {
      return HttpResponse.json([createMockGame({
        id: 1,
        igdb_id: parseInt(igdbId.replace('eq.', '')),
      })]);
    }
    
    // Return list of games
    const games = Array.from({ length: 10 }, (_, i) => 
      createMockGame({ id: i + 1 })
    );
    
    return HttpResponse.json(games);
  }),

  // Create game
  http.post('*/rest/v1/game', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockGame({
      ...body,
      id: Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    }));
  }),

  // ============================================
  // Supabase Database - Comments
  // ============================================
  
  // Get comments
  http.get('*/rest/v1/comment', async ({ request }) => {
    const url = new URL(request.url);
    const ratingId = url.searchParams.get('rating_id');
    
    const comments = Array.from({ length: 3 }, (_, i) => 
      createMockComment({
        id: i + 1,
        rating_id: ratingId ? parseInt(ratingId.replace('eq.', '')) : 1,
      })
    );
    
    return HttpResponse.json(comments);
  }),

  // Create comment
  http.post('*/rest/v1/comment', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockComment({
      ...body,
      id: Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    }));
  }),

  // ============================================
  // Supabase Database - Activities
  // ============================================
  
  // Get activities
  http.get('*/rest/v1/activities', async () => {
    const activities = Array.from({ length: 10 }, (_, i) => 
      createMockActivity({ id: i + 1 })
    );
    
    return HttpResponse.json(activities);
  }),

  // ============================================
  // Supabase Database - Collections/Wishlists
  // ============================================
  
  // Get user collection
  http.get('*/rest/v1/user_collection', async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const games = Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        user_id: parseInt(userId.replace('eq.', '')),
        game_id: i + 100,
        igdb_id: 1000 + i,
        added_at: new Date().toISOString(),
      }));
      return HttpResponse.json(games);
    }
    
    return HttpResponse.json([]);
  }),

  // Get user wishlist
  http.get('*/rest/v1/user_wishlist', async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const games = Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        user_id: parseInt(userId.replace('eq.', '')),
        game_id: i + 200,
        igdb_id: 2000 + i,
        added_at: new Date().toISOString(),
      }));
      return HttpResponse.json(games);
    }
    
    return HttpResponse.json([]);
  }),

  // ============================================
  // Supabase Database - Game Progress
  // ============================================
  
  // Get game progress
  http.get('*/rest/v1/game_progress', async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const progress = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        user_id: parseInt(userId.replace('eq.', '')),
        game_id: i + 300,
        igdb_id: 3000 + i,
        started: i % 2 === 0,
        completed: i % 3 === 0,
        started_date: i % 2 === 0 ? new Date().toISOString() : null,
        completed_date: i % 3 === 0 ? new Date().toISOString() : null,
      }));
      return HttpResponse.json(progress);
    }
    
    return HttpResponse.json([]);
  }),

  // ============================================
  // Supabase Realtime
  // ============================================
  
  // WebSocket connection for real-time subscriptions
  http.get('*/realtime/v1/websocket', () => {
    return new HttpResponse(null, { 
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      }
    });
  }),

  // ============================================
  // IGDB API (via Netlify Functions)
  // ============================================
  
  // Search games
  http.post('*/.netlify/functions/igdb-search', async ({ request }) => {
    const body = await request.json() as any;
    const { searchTerm, limit = 10 } = body;
    
    // Generate mock games based on search
    const games = Array.from({ length: limit }, (_, i) => 
      createMockGame({
        id: i + 1,
        name: `${searchTerm} Game ${i + 1}`,
        igdb_id: Math.floor(Math.random() * 99999),
      })
    );
    
    return HttpResponse.json({
      games,
      totalCount: 100,
      hasMore: true,
    });
  }),

  // Get game details
  http.post('*/.netlify/functions/igdb-game', async ({ request }) => {
    const body = await request.json() as any;
    const { gameId } = body;
    
    return HttpResponse.json(createMockGame({
      id: 1,
      igdb_id: gameId,
      name: `Game ${gameId}`,
    }));
  }),

  // ============================================
  // Supabase Edge Functions (Fallback IGDB)
  // ============================================
  
  // IGDB proxy fallback
  http.post('*/functions/v1/igdb-proxy', async ({ request }) => {
    const body = await request.json() as any;
    const { endpoint, params } = body;
    
    if (endpoint === 'games') {
      const games = Array.from({ length: 10 }, (_, i) => 
        createMockGame({ id: i + 1 })
      );
      return HttpResponse.json(games);
    }
    
    return HttpResponse.json([]);
  }),

  // ============================================
  // RPC Functions
  // ============================================
  
  // Get user activity feed
  http.post('*/rest/v1/rpc/get_user_activity_feed', async () => {
    const activities = Array.from({ length: 20 }, (_, i) => 
      createMockActivity({ id: i + 1 })
    );
    
    return HttpResponse.json(activities);
  }),

  // Get trending games
  http.post('*/rest/v1/rpc/get_trending_games', async () => {
    const games = Array.from({ length: 10 }, (_, i) => 
      createMockGame({ id: i + 1 })
    );
    
    return HttpResponse.json(games);
  }),
];