# GameVault - Advanced Gaming Community Platform

A modern, feature-rich gaming community platform built with React, TypeScript, Supabase, and IGDB API integration. GameVault provides gamers with a comprehensive platform to discover, rate, review, and discuss their favorite games in an engaging social environment. a

## 🚀 Current Features

### 🎮 Core Gaming Features
- **IGDB API Integration**: Real-time game data from the Internet Game Database
- **Advanced Game Search**: Multi-filter search with platform, genre, rating, and release date filters
- **Game Discovery**: Browse popular, trending, and recommended games
- **Detailed Game Pages**: Rich game information with screenshots, descriptions, and metadata
- **Rating System**: 1-10 scale ratings with half-point precision and visual star ratings
- **Review System**: Comprehensive reviews with like/dislike functionality
- **Game Collections**: Personal game lists (wishlist, favorites, completed, etc.)

### 👤 User Management & Authentication
- **Supabase Authentication**: Secure user registration and login
- **Advanced User Profiles**: Customizable profiles with avatars, bios, and social links
- **Username System**: Unique usernames with validation and change tracking (3 changes per day)
- **Email Management**: Email verification and change functionality with validation
- **User Settings Modal**: Comprehensive profile editing with unsaved changes protection
- **User Activity Feeds**: Real-time activity tracking and display
- **Follow System**: User following/followers with social interactions

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first design optimized for all devices
- **Modern Navigation**: Multiple navbar variants with user-friendly interfaces
- **Dark Theme**: Sleek dark theme with purple/blue accent colors
- **Interactive Components**: Hover effects, animations, and smooth transitions
- **Modal System**: Advanced modal management with backdrop handling
- **Real-time Updates**: Live data synchronization and notifications
- **Optimized Images**: Lazy loading and image optimization

### 🔧 Advanced Technical Features
- **Performance Optimized**: Code splitting, virtual scrolling, and optimized rendering
- **Caching System**: Multi-layer caching for IGDB data and user content
- **Error Boundaries**: Graceful error handling and recovery
- **SEO Optimized**: Meta tags, OpenGraph, and structured data
- **PWA Ready**: Progressive Web App capabilities
- **Real-time Features**: Live activity feeds and notifications
- **Database Migrations**: Complete database schema with proper relationships

### 📊 Social & Community Features
- **Activity Feeds**: Real-time user activity tracking
- **Notification System**: Comprehensive notification management
- **Comment System**: Threaded comments on reviews
- **Like System**: Like/dislike functionality for reviews and comments
- **User Stats**: Gaming statistics and achievements
- **Search Users**: Find and connect with other gamers

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **React Hook Form** with Zod validation
- **Lucide React** for icons
- **Material-UI** components
- **Zustand** for state management

### Backend & Database
- **Supabase** (PostgreSQL, Auth, Real-time, Edge Functions)
- **Row Level Security (RLS)** for data protection
- **Complex database schema** with proper relationships
- **Database migrations** with version control

### External APIs
- **IGDB API** via Netlify Functions for game data
- **Twitch API** for IGDB authentication

### Development & Deployment
- **Vite** for build tooling
- **TypeScript** for type safety
- **ESLint** for code quality
- **Netlify** for deployment and serverless functions

## 📦 Installation & Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 8.0.0
- Supabase account
- Twitch Developer account (for IGDB API)

### 1. Clone and Install
```bash
git clone <repository-url>
cd VGReviewApp2-UserLoginSys-1A
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# IGDB/Twitch API Configuration
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_APP_ACCESS_TOKEN=your_twitch_access_token

# Application Configuration
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database migrations in order:
   ```sql
   -- Run in Supabase SQL Editor
   -- Execute: supabase/migrations/[timestamp]_complete_gamevault_schema.sql
   -- Execute: supabase/migrations/20250130000000_username_change_tracking.sql
   ```

### 4. IGDB API Setup

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Copy the Client ID
4. Generate an access token:
   ```bash
   curl -X POST "https://id.twitch.tv/oauth2/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials"
   ```

## 🚀 Development

### Local Development
```bash
# Start development server
npm run dev

# Start with Netlify functions (recommended)
netlify dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

### Testing Features
- Navigate to `/igdb-test` in development for API testing
- Use the various demo pages to test components
- Check browser console for detailed logging

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with:

### Core Tables
- **users**: Extended user profiles with provider integration
- **games**: IGDB-integrated game database
- **ratings**: User ratings and reviews (1-10 scale)
- **comments**: Threaded comment system
- **notifications**: Real-time notification system
- **user_follows**: Social following system
- **username_changes**: Username change tracking with daily limits

### Advanced Features
- **Row Level Security (RLS)** on all tables
- **Database triggers** for automatic updates
- **Proper indexes** for performance
- **Foreign key constraints** for data integrity

## 🔧 Key Components

### User Interface
- **UserSettingsModal**: Advanced profile editing with validation
- **ResponsiveNavbar**: Multi-device navigation system
- **GameCard**: Interactive game display components
- **ActivityFeed**: Real-time user activity display
- **SearchBar**: Advanced search with filtering

### Services
- **emailService**: Email validation and verification
- **usernameService**: Username management with rate limiting
- **igdbService**: Game data integration with caching
- **authService**: Authentication management
- **notificationService**: Real-time notifications

## 🚀 Deployment

### Netlify Deployment
1. Connect your repository to Netlify
2. Configure environment variables in Netlify dashboard
3. Deploy - the build settings are configured in `netlify.toml`

### Environment Variables for Production
```env
TWITCH_CLIENT_ID=your_production_client_id
TWITCH_APP_ACCESS_TOKEN=your_production_access_token
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_key
VITE_APP_ENV=production
VITE_APP_URL=https://your-domain.com
```

## 📱 Features in Detail

### Advanced User Profiles
- Modal-based profile editing with unsaved changes protection
- Username validation with uniqueness checking and daily limits
- Email verification and change system with database validation
- Real-time form validation with visual feedback
- Avatar upload and management

### Game Discovery & Management
- Advanced search with multiple filters
- Real-time game data from IGDB
- Caching system for improved performance
- Game collections and personal lists
- Rating and review system with social features

### Social Features
- User following system
- Real-time activity feeds
- Notification system
- Comment threads on reviews
- Like/dislike functionality

## 🔒 Security

- **Row Level Security (RLS)** implemented on all database tables
- **Input validation** with Zod schemas
- **CORS properly configured** for API access
- **Environment variable protection**
- **Secure authentication flow** with Supabase Auth
- **Rate limiting** on sensitive operations (username changes)

## 📊 Performance

- **Optimized bundle size** with code splitting
- **Virtual scrolling** for large lists
- **Image optimization** and lazy loading
- **Database query optimization** with proper indexes
- **Caching strategies** for external API calls
- **Real-time subscriptions** for live data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions and support:
- Check the documentation
- Open an issue on GitHub
- Review the code comments for implementation details

---

**GameVault** - Built with ❤️ for the gaming community
