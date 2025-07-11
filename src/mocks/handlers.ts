import { rest } from 'msw';

// Mock API endpoints
export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg'
      })
    );
  }),
  
  rest.post('/api/auth/signup', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        avatarUrl: null
      })
    );
  }),
  
  // User profile endpoints
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    return res(
      ctx.status(200),
      ctx.json({
        id,
        username: 'testuser',
        email: 'user@example.com',
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        stats: {
          gamesPlayed: 42,
          gamesCompleted: 24,
          reviewsWritten: 18,
          averageRating: 8.5
        }
      })
    );
  }),
  
  // Game search endpoints
  rest.get('/api/games/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: '1',
            title: 'The Witcher 3',
            coverImage: 'https://example.com/witcher3.jpg',
            releaseDate: '2015-05-19',
            genre: 'RPG',
            rating: 9.5
          },
          {
            id: '2',
            title: 'Cyberpunk 2077',
            coverImage: 'https://example.com/cyberpunk.jpg',
            releaseDate: '2020-12-10',
            genre: 'RPG',
            rating: 7.8
          }
        ],
        total: 2
      })
    );
  })
];