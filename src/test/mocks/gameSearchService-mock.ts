// Mock gameSearchService for testing
import { generateMockGames, getFranchiseInfo } from '../fast-mocks';

export const gameSearchService = {
  searchGames: jest.fn(async (params: any, options?: any) => {
    const query = typeof params === 'string' ? params : params.query;
    const limit = options?.limit || 50;
    
    const info = getFranchiseInfo(query);
    const games = generateMockGames(Math.min(info.count, limit), query);
    
    return {
      games,
      totalCount: info.count,
      hasMore: info.count > limit
    };
  }),
  
  searchGamesWithFallback: jest.fn(async (query: string) => {
    const info = getFranchiseInfo(query);
    const games = generateMockGames(info.count, query);
    
    return {
      games,
      totalCount: info.count,
      hasMore: false
    };
  }),
  
  searchIGDB: jest.fn(async (query: string, limit = 50) => {
    const info = getFranchiseInfo(query);
    const games = generateMockGames(Math.min(info.count, limit), query);
    
    return {
      games,
      totalCount: info.count,
      hasMore: info.count > limit
    };
  })
};