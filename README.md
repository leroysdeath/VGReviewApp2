VGReviewApp2

## Database Setup

This application uses Supabase as the database backend. To set up the database connection:

1. **Install Dependencies**
   ```bash
   npm install dotenv @supabase/supabase-js
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL and anon key:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Schema**
   The application expects the following tables:
   - `user` - User accounts and profiles
   - `game` - Game information and metadata
   - `platform` - Gaming platforms (PC, PlayStation, etc.)
   - `platform_games` - Many-to-many relationship between games and platforms
   - `rating` - User ratings and reviews for games
   - `comment` - User comments
   - `comment_like` - Likes/dislikes for comments

4. **Usage**
   The database integration provides:
   - User authentication and profiles
   - Game catalog with ratings and reviews
   - Platform management
   - Real-time data synchronization
   - Type-safe database operations

## Features

- **Database Integration**: Full Supabase integration with TypeScript types
- **User Management**: User profiles, authentication, and statistics
- **Game Catalog**: Comprehensive game database with ratings and reviews
- **Rating System**: 1-10 scale ratings with optional text reviews
- **Platform Support**: Multi-platform game tracking
- **Real-time Updates**: Live data synchronization
- **Type Safety**: Full TypeScript support for database operations

## Development

The application includes both mock data (for development) and real database integration:
- Mock data is used when database is not configured
- Real database operations when Supabase is properly set up
- Seamless transition between development and production data
