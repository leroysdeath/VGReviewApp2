# VGReviewApp2 - Gaming Community Platform

A modern gaming community platform built with React, TypeScript, and Supabase, featuring IGDB integration for comprehensive game data and a rich social experience for gamers.

## 🎮 Features

### Core Features
- **Game Discovery & Search**: Real-time search powered by IGDB API with 100,000+ games
- **User Authentication**: Secure authentication via Supabase Auth
- **Rating System**: 1-10 scale ratings with half-point precision
- **Review System**: Write detailed reviews with rich text formatting
- **Comment System**: Threaded comments with likes/dislikes
- **User Profiles**: Customizable profiles with bio, stats, and activity history
- **Responsive Design**: Mobile-first design optimized for all devices
- **Real-time Updates**: Live data synchronization with Supabase

### Advanced Features
- **Activity Feed**: Track user activities, reviews, and interactions
- **Gamification**: User levels, achievements, challenges, and leaderboards
- **Platform Tracking**: Track games across PC, PlayStation, Xbox, Nintendo Switch
- **Advanced Filtering**: Filter by genre, platform, release date, rating
- **PWA Support**: Progressive Web App with offline capabilities
- **Performance Optimized**: Code splitting, lazy loading, and caching

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v7** - Client-side routing
- **Lucide React** - Modern icon library
- **SWR** - Data fetching with caching
- **Zustand** - State management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation

### Backend & Services
- **Supabase** - PostgreSQL database, authentication, real-time subscriptions
- **IGDB API** - Game database integration via Netlify Functions
- **Netlify Functions** - Serverless API endpoints
- **Netlify** - Deployment and hosting

### Additional Libraries
- **@mui/material** - Material UI components
- **react-datepicker** - Date selection
- **react-select** - Advanced select components
- **lodash** - Utility functions
- **socket.io-client** - Real-time communication

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vgreviewapp2.git
   cd vgreviewapp2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # IGDB API Configuration (for Netlify Functions)
   TWITCH_CLIENT_ID=your-twitch-client-id
   TWITCH_APP_ACCESS_TOKEN=your-twitch-access-token

   # Environment
   VITE_APP_ENV=development
   VITE_APP_URL=http://localhost:5173
   ```

## 🗄️ Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database migrations** in order:
   ```sql
   -- Run these in your Supabase SQL editor:
   -- 1. supabase/migrations/20250710062526_crimson_dust.sql (Core tables)
   -- 2. supabase/migrations/20250710074645_azure_water.sql (Updated schema)
   -- 3. supabase/migrations/20250711213739_floral_field.sql (Gamification)
   -- 4. supabase/migrations/20250713020715_foggy_shore.sql (Activity tracking)
   -- 5. supabase/migrations/20250713023805_stark_reef.sql (Comments & likes)
   ```

3. **Enable Row Level Security (RLS)** - Already configured in migrations

## 🎮 IGDB Integration

1. **Get IGDB Credentials**
   - Create app at [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Get your Client ID and Client Secret

2. **Generate Access Token**
   ```bash
   curl -X POST 'https://id.twitch.tv/oauth2/token' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -d 'client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials'
   ```

3. **Configure Netlify Functions**
   - Add credentials to Netlify environment variables
   - Functions automatically deployed from `netlify/functions/`

## 🚀 Development

### Start Development Server
```bash
# With Netlify Dev (includes functions)
netlify dev

# Standard development (uses mock data for IGDB)
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Project Structure
```
vgreviewapp2/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── stores/         # Zustand stores
│   ├── types/          # TypeScript types
│   ├── context/        # React contexts
│   └── utils/          # Helper functions
├── netlify/
│   └── functions/      # Serverless functions
├── supabase/
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── dist/              # Build output
```

## 📱 Key Pages & Routes

- `/` - Landing page with featured games
- `/search` - Game search with filters
- `/game/:id` - Individual game page
- `/user/:id` - User profile page
- `/review/:gameId` - Write/edit review
- `/login` - Authentication page
- `/profile` - User settings
- `/igdb-test` - IGDB integration testing (dev only)

## 🎨 Component System

### Shared Components
- `ResponsiveNavbar` - Adaptive navigation
- `GameCard` - Game display cards
- `ReviewCard` - Review display
- `UserPageLayout` - Consistent user page structure
- `ErrorBoundary` - Error handling
- `SEOHead` - SEO optimization

### Design System
- Dark theme with game-inspired colors
- Responsive breakpoints: mobile, tablet, desktop
- Glassmorphism effects
- Smooth animations and transitions
- Accessible color contrasts

## 🔒 Security

- Row Level Security (RLS) on all tables
- Secure authentication flow
- Environment variable protection
- Input validation with Zod
- XSS protection
- CORS properly configured

## 📊 Performance

- Lighthouse score: 95+
- Code splitting by route
- Image lazy loading
- SWR caching strategy
- Optimized bundle size
- Service worker for offline support

## 🚀 Deployment

### Deploy to Netlify

1. **Connect to GitHub**
   ```bash
   # Push to GitHub
   git push origin main
   ```

2. **Import to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Import project from GitHub
   - Netlify will auto-detect settings from `netlify.toml`

3. **Configure Environment Variables** in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `TWITCH_CLIENT_ID`
   - `TWITCH_APP_ACCESS_TOKEN`

4. **Deploy**
   - Automatic deployment on push to main
   - Preview deployments for pull requests

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test

# Test IGDB integration
# Visit /igdb-test in development mode
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful component and variable names
- Write descriptive commit messages
- Add comments for complex logic
- Ensure responsive design
- Test on multiple devices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the documentation
- Open an issue on GitHub
- Contact the development team

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced recommendation engine
- [ ] Social features (friends, messages)
- [ ] Game collections/lists
- [ ] Import from other platforms
- [ ] Advanced analytics dashboard
- [ ] Moderation tools
- [ ] API for third-party developers

---

Built with ❤️ for the gaming community
