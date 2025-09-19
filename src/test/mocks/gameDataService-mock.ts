// Mock gameDataService for testing
import { generateMockGames, getFranchiseInfo } from '../fast-mocks';

export const gameDataService = {
  searchGames: jest.fn(async (query: string) => {
    const info = getFranchiseInfo(query);
    return generateMockGames(info.count, query);
  }),
  
  searchGamesExact: jest.fn(async (query: string) => {
    const info = getFranchiseInfo(query);
    return generateMockGames(Math.min(info.count, 10), query);
  }),
  
  searchGamesBasic: jest.fn(async (query: string) => {
    const info = getFranchiseInfo(query);
    return generateMockGames(info.count, query);
  }),
  
  getGameById: jest.fn(async (id: string | number) => {
    return {
      id: Number(id),
      igdb_id: Number(id) + 10000,
      name: `Game ${id}`,
      developer: 'Mock Developer',
      publisher: 'Mock Publisher',
      category: 0,
      summary: 'Mock summary',
      description: 'Mock description',
      pic_url: 'https://example.com/image.jpg',
      release_date: '2023-01-01',
      genres: ['Action'],
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
  }),
  
  getRecentGames: jest.fn(async () => {
    return generateMockGames(10, 'Recent');
  }),
  
  getTopRatedGames: jest.fn(async () => {
    return generateMockGames(10, 'Top Rated');
  })
};