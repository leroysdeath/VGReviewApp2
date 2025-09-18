// Mock Supabase client for testing
import { Database } from '../types/supabase';
import { fastServiceMocks } from './fast-mocks';

// Create a mock supabase client
export const supabase = {
  from: jest.fn((table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      ilike: jest.fn(() => Promise.resolve({ data: [], error: null })),
      or: jest.fn(() => Promise.resolve({ data: [], error: null })),
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  
  rpc: jest.fn((functionName: string, params?: any) => {
    if (functionName === 'search_games_secure') {
      // Return mock search results based on the query
      const query = params?.search_query || '';
      const limit = params?.limit_count || 50;
      
      // Use the fast mock service for consistent results
      return fastServiceMocks.gameSearchService.searchGames(query).then((games: any[]) => {
        const results = games.slice(0, limit).map((game: any, index: number) => ({
          id: game.id,
          search_rank: 1.0 - (index * 0.01)
        }));
        return { data: results, error: null };
      });
    }
    return Promise.resolve({ data: null, error: null });
  }),
  
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn()
    }))
  }))
};