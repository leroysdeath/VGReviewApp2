# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VGReviewApp2 is a mature gaming community platform built with React, TypeScript, Supabase, and IGDB API integration. It allows users to discover games, write reviews, rate games, and interact with the gaming community.

**Current Scale:**
- **185K+ Games**: Comprehensive database with IGDB integration and automated sync
- **~103K Lines**: TypeScript/TSX codebase with 50+ services and comprehensive architecture
- **Active Development**: On `main` branch with recent search and sync improvements
- **Production Ready**: Deployed on Netlify with Supabase backend

## Design Philosophy & Architecture Pattern

### Design Pattern: Pragmatic Monolith with Feature-Based Modularity

This is a content-driven community platform following a monolithic SPA architecture with feature-based organization. Think Letterboxd/Backloggd, not Netflix or Steam.

### Core Design Principles

#### 1. Content-First, Not Service-Oriented

- This is a CRUD application for user-generated content (reviews, ratings, lists)
- NOT a microservices platform - avoid service abstraction layers
- NOT an enterprise app - skip complex state machines, sagas, or event sourcing
- Data flows directly: Database → API → Component → User

#### 2. Feature-Based, Not Atomic

- Organize by user-facing features (Profile, Reviews, Games), not technical layers
- Each feature should be self-contained with its own components, hooks, and services
- Avoid excessive component atomization - a ReviewCard is fine, don't split into ReviewTitle, ReviewRating, ReviewBody
- Rule of thumb: If a component is only used in one place, it shouldn't be "atomic"

#### 3. Convention Over Configuration

- Use Supabase's built-in patterns directly - don't wrap in abstraction layers
- Leverage database-driven functionality (RLS, triggers, views) over client-side logic
- Standard REST patterns, not GraphQL or complex query builders
- Direct SQL queries are fine - this isn't a multi-database platform

### Anti-Patterns to Avoid

❌ **DO NOT:**
- Create abstract factory patterns for simple components
- Build generic "data provider" layers over Supabase
- Implement Redux/MobX for state that Zustand handles fine
- Create middleware layers for straightforward API calls
- Build "atomic design systems" for a focused gaming platform
- Add dependency injection containers or IoC patterns
- Implement event-driven architectures for simple user actions

✅ **INSTEAD DO:**
- Write direct, readable code that solves the immediate problem
- Use Supabase client directly in services
- Keep components focused but complete (not fragmented)
- Colocate related code in feature folders
- Use built-in browser APIs and React features

### Architectural Context

**What This IS:**
- A social cataloging platform like Letterboxd for games
- A community-driven review site like Backloggd
- A personal gaming tracker like MyAnimeList
- A discovery platform for finding new games

**What This IS NOT:**
- NOT a game store (Steam, Epic)
- NOT a streaming service (Xbox Game Pass)
- NOT a social network (Discord, Reddit)
- NOT an analytics platform (Steam Charts)
- NOT a competitive platform (Twitch, ESL)

### Technical Decision Framework

When making architectural decisions, ask:

1. **"Does this directly improve the user's ability to track, review, or discover games?"**
   - If no, it's probably overengineering

2. **"Would Letterboxd need this complexity for the same feature?"**
   - If no, you don't need it either

3. **"Can this be solved with existing Supabase features?"**
   - If yes, use Supabase directly without abstraction

4. **"Will this pattern be used in more than 3 places?"**
   - If no, don't abstract it yet

This is a pragmatic, user-focused platform, not a technical showcase. The complexity should be in the features users see (rich reviews, smart recommendations, social interactions), not in the architecture they don't.

## Development Commands

```bash
# Install dependencies (requires Node.js >=20.0.0)
npm install

# Start development server with Netlify Functions
netlify dev  # Runs on http://localhost:8888 with working IGDB API functions

# Start development server (uses mock data for IGDB)
npm run dev  # Runs on http://localhost:5173

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview

# Clean build artifacts
npm run clean

# IGDB Database Sync (requires netlify dev running)
npm run sync-igdb          # Live sync - adds new games to database
npm run sync-igdb:dry      # Test sync - shows what would be added
npm run sync-igdb:help     # Show sync options and documentation

# Testing (comprehensive test suite)
npm run test               # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
npm run test:fast          # Quick tests only
npm run test:ci            # CI-optimized test run
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with TypeScript, Tailwind CSS, React Router v6
- **State Management**: Zustand for stores, React Context for auth/reviews, SWR for data fetching
- **Backend**: Supabase (PostgreSQL database, Auth, Row Level Security, Real-time subscriptions)
- **API Integration**: IGDB via Netlify Functions with comprehensive sync system
- **Testing**: Jest with React Testing Library setup (30+ test configurations)
- **Build Tools**: Vite with bundle analysis and optimizations
- **Deployment**: Netlify with serverless functions and CI/CD

### Key Architectural Patterns

1. **API Integration Strategy**: The app uses multiple fallback layers for IGDB API:
   - Primary: Netlify Functions at `/.netlify/functions/igdb-search`
   - Secondary: Supabase Edge Functions at `/functions/v1/igdb-proxy`
   - Fallback: Mock data for development/testing

2. **Authentication Flow**: Supabase Auth handles user authentication with automatic user profile creation via database triggers. The auth state is managed through `useAuth` hook and `AuthModalContext`.

3. **Real-time Features**: Uses Supabase real-time subscriptions for activity feeds and notifications through `realTimeService`.

4. **Performance Optimizations**:
   - Code splitting with manual chunks (vendor, supabase, ui)
   - Image optimization with lazy loading (`OptimizedImage`, `LazyImage`)
   - Virtual scrolling for large lists (`VirtualizedActivityFeed`)
   - Aggressive caching strategies via service workers and CDN headers

### Directory Structure

**Current Structure (Mature Codebase):**
- `/src/components/` (~150 components) - Feature-organized React components
  - `/auth/` - Authentication modals and guards
  - `/profile/` - User profile management and display
  - `/comments/` - Threaded comment system
  - Core UI components (GameCard, SearchResults, etc.)
- `/src/pages/` (~30 pages) - Route page components with SSR optimization
- `/src/hooks/` (~25 hooks) - Custom React hooks for data fetching and utilities
- `/src/services/` (**50+ services**) - Comprehensive API services and business logic
  - Game data services (`gameDataServiceV2.ts`, `igdbServiceV2.ts`)
  - Search services with caching and analytics
  - User management and authentication
  - Real-time features and notifications
  - Privacy and GDPR compliance services
- `/src/context/` - React Context providers for auth and reviews
- `/src/store/` - Zustand stores for global state management
- `/src/features/` - Feature-based organization (activity feeds, etc.)
- `/src/utils/` - Utility functions for security, formatting, and performance
- `/src/test/` - Test utilities and factories
- `/netlify/functions/` - IGDB API proxy functions
- `/supabase/` - Database migrations and infrastructure
- `/scripts/` - Database sync and maintenance scripts

**Optimal Structure (per Design Philosophy):**
```
/src
  /pages           - Route components (ProfilePage, GamePage)
  /features        - Feature modules
    /reviews       - Everything for reviews (components, hooks, utils)
    /games         - Game browsing and details
    /profile       - User profiles and settings
  /shared          - Truly shared utilities
    /components    - Used across 3+ features (Button, Modal)
    /hooks         - Generic hooks (useDebounce, useInfiniteScroll)
  /services        - Direct Supabase operations per table
```

### Database Schema

The app uses Supabase PostgreSQL with Row Level Security (RLS) and comprehensive data architecture:

**Core Tables:**
- `game` (185K+ records) - Main game database with IGDB sync, search optimization, and metadata
- `user` - User profiles with automatic creation on auth signup
- `rating` - Game reviews and ratings with playtime tracking
- `comment` - Review comments with threading support
- `notification` - User notification system

**Game Management:**
- `game_progress` - User game completion tracking
- `user_collection` / `user_wishlist` - Game ownership and want-to-play lists
- `game_state_history` - Audit log for all game state transitions
- `user_top_games` - User's favorite games (top 5)

**Content & Social:**
- `content_like` - Likes for reviews and comments
- `user_follow` - User following system
- `tag` / `game_tag` - Game tagging system

**Performance & Analytics:**
- `search_cache` / `igdb_cache` / `games_cache` - Multi-layer caching system
- `search_analytics` - Search behavior tracking
- `game_views` / `game_metrics_daily` - Privacy-compliant view tracking
- `cache_statistics` - Cache performance monitoring

**Data Management:**
- `game_import_queue` - IGDB sync queue management
- `game_requests` - User requests for missing games
- `game_backfill_log` - Data sync audit trail

**Privacy & Security:**
- `user_preferences` - GDPR-compliant privacy settings
- `privacy_audit_log` - Privacy action audit trail
- `security_guidelines` - Database security best practices

### Environment Configuration

Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `TWITCH_CLIENT_ID` - IGDB/Twitch client ID (for Netlify functions)
- `TWITCH_APP_ACCESS_TOKEN` - IGDB/Twitch access token (for Netlify functions)

### Testing Approach

Comprehensive testing infrastructure is implemented:

**Current Setup:**
- **Jest** with React Testing Library for component and integration tests
- **30+ test configurations** (jest.config.*.js files) for different test scenarios:
  - `npm run test:unit` - Fast unit tests
  - `npm run test:integration` - Database and API integration tests
  - `npm run test:search` - Search functionality tests
  - `npm run test:advanced` - Comprehensive test runner with analytics
- **Mock Service Worker (MSW)** for API mocking
- **@faker-js/faker** for test data generation
- **Test utilities** in `/src/test/` for reusable test helpers

**Test Coverage Areas:**
- Authentication flows and modals
- Game search and data services
- User profile and social features
- Database operations with Supabase mocking
- IGDB API integration testing

### Common Development Tasks

1. **Adding a new page**: Create component in `/src/pages/`, add route in `App.tsx`
2. **Adding API endpoint**: Create function in `/netlify/functions/` or `/supabase/functions/`
3. **Database changes**: Add migration file in `/supabase/migrations/`
4. **State management**: Use Zustand stores in `/src/store/` for global state, Context for component trees

### Important Conventions

**Architecture:**
- All API calls go through service layers in `/src/services/` (50+ services available)
- Use TypeScript strict mode - comprehensive typing throughout codebase
- Follow established patterns - check existing similar components/services first
- Leverage the mature service ecosystem rather than creating new services

**Data & API:**
- Image URLs from IGDB use `t_1080p` quality (recently upgraded from `t_cover_big`)
- Database operations use Supabase RLS and optimized queries
- IGDB sync runs through `scripts/sync-igdb.js` with comprehensive error handling
- Search operations use multi-tier caching (browser, Supabase, IGDB)

**UI & UX:**
- Use Tailwind CSS for styling - avoid inline styles
- Implement error boundaries (`ReviewErrorBoundary.tsx`) for robust error handling
- Components support mobile-first responsive design
- Use established UI patterns from existing component library

**Security & Privacy:**
- Always validate and sanitize user inputs (comprehensive utils available)
- GDPR compliance through `privacyService.ts` and `gdprService.ts`
- Row Level Security (RLS) enforced on all database tables
- Privacy-compliant analytics and tracking

### Code Modification Guidelines

- For every file that you recommend changes to, please review the entire file before you give recommendations
- Prioritize accuracy over token/usage efficiency
- Prioritize streamlined, non-redundant file structure
- Don't provide code that changes styling or color scheme or other aesthetics without explicit permission
- Do not recommend creating new pages, files, routes, or functions when one already exists that serves the same or similar function

## Debugging Production Issues - Critical Lessons

### 1. Make Errors Readable First
**Before attempting any fix**, ensure you can see the actual error:
- **Enable source maps immediately**: Set `sourcemap: true` in build config
- **Disable minification temporarily**: Set `minify: false` to see real variable names
- **Test production builds locally**: Run `npm run build && npm run preview` before deployment

### 2. Understand Build vs Runtime Differences
Production errors often stem from build optimizations, not logic bugs:
- **Variable scoping issues**: Minifiers can expose temporal dead zones and closure problems
- **Module resolution differences**: Dev server uses different loading strategies than production
- **Dead code elimination**: Unused exports might work in dev but break in production

### 3. Search Comprehensively Before Changing
When refactoring variables or functions:
- **Find ALL usages first**: `grep -n "variableName" src/**/*.ts` before removing anything
- **Check dependency arrays**: React hooks capture variables in closures
- **Look for indirect references**: Callbacks, event handlers, and computed properties

### 4. Fix Systematically, Not Randomly
- **One variable at a time**: Don't do global find/replace without understanding context
- **Test incrementally**: Build after each significant change
- **Keep rollback points**: Commit working states before major refactors

### 5. Common Production-Only Error Patterns

#### Lexical Declaration Errors ("can't access X before initialization")
- **Cause**: Variable hoisting issues or circular dependencies
- **Fix**: Compute values inline or ensure proper initialization order

#### Undefined Variable Errors ("X is not defined")  
- **Cause**: Variable removed but still referenced in closures
- **Fix**: Update all references, especially in callback functions and dependency arrays

#### Hydration Mismatches (React SSR)
- **Cause**: Client/server render differences
- **Fix**: Ensure consistent initial state and avoid browser-only APIs during initial render

### 6. Establish a Debugging Protocol
1. **Reproduce locally** with production build
2. **Make errors readable** (source maps, no minification)
3. **Identify the actual issue** (not just symptoms)
4. **Search for all occurrences** of the problematic code
5. **Fix systematically** with understanding
6. **Test the production build** before deploying

### 7. Prevent Future Issues
- **TypeScript strict mode**: Catches many issues at compile time
- **ESLint rules**: Enable `no-unused-vars` and `no-undef`
- **Pre-commit hooks**: Run build and type-check before commits
- **CI/CD checks**: Automated production build testing

Remember: If an error only appears in production, it's almost always about the build process, not the business logic. Focus on compilation, bundling, and optimization issues first.

## IGDB Sync System

Comprehensive database synchronization system for maintaining current game data:

**Current Sync Infrastructure:**
- **Manual Sync Script**: `scripts/sync-igdb.js` - Well-structured Node.js sync process
- **Database Scale**: 185K+ games with 99.9% from IGDB
- **Smart Integration**: `gameDataServiceV2.ts` with on-demand IGDB supplementation
- **Multi-Strategy Queries**: Handles `updated_at`, franchise searches, and targeted imports

**Sync Commands:**
```bash
# Test what would be synced (recommended first step)
npm run sync-igdb:dry

# Run actual sync (adds games to database)
npm run sync-igdb

# Custom sync options
node scripts/sync-igdb.js --days 14 --limit 100
```

**Current Sync Gaps:**
- **Manual Only**: No automated scheduling (requires manual execution)
- **Coverage Gaps**: Recent games (2023+: 1,069 vs expected 3,000+)
- **Single Strategy**: Only syncs by `updated_at`, misses new releases
- **No Franchise Monitoring**: Missing targeted franchise updates for popular series

**Sync Documentation**: See `/docs/IGDB_SYNC.md` for detailed sync system documentation

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
With 50+ services and 185K+ games, functionality likely already exists - check first.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## 🔐 CRITICAL SECURITY REQUIREMENT
NEVER include hardcoded JWT tokens, API keys, or secrets in ANY code. ALWAYS use environment variables. 
See SECURITY_PREFERENCES.md for complete security guidelines that MUST be followed at all times.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.