# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VGReviewApp2 is a gaming community platform built with React, TypeScript, Supabase, and IGDB API integration. It allows users to discover games, write reviews, rate games, and interact with the gaming community.

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
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with TypeScript, Tailwind CSS, React Router v6
- **State Management**: Zustand for stores, React Context for auth/reviews, SWR for data fetching
- **Backend**: Supabase (PostgreSQL database, Auth, Edge Functions)
- **API Integration**: IGDB via Netlify Functions (primary) or Supabase Edge Functions (fallback)
- **Deployment**: Netlify with serverless functions

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

**Current Structure:**
- `/src/components/` - React components organized by feature
  - `/auth/` - Authentication components
  - `/profile/` - User profile components
  - `/comments/` - Comment system components
  - `/user/` - User-specific components
- `/src/pages/` - Route page components
- `/src/hooks/` - Custom React hooks for data fetching and utilities
- `/src/services/` - API services and business logic
- `/src/context/` - React Context providers
- `/src/store/` - Zustand stores for global state
- `/netlify/functions/` - Serverless functions for IGDB API proxy
- `/supabase/` - Database migrations and edge functions

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

The app uses Supabase PostgreSQL with Row Level Security (RLS). Key tables include:
- `users` - User profiles with automatic creation on auth signup
- `reviews` - Game reviews and ratings
- `comments` - Review comments
- `activities` - User activity feed
- `game_progress` - User game progress tracking
- `notifications` - User notifications

### Environment Configuration

Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `TWITCH_CLIENT_ID` - IGDB/Twitch client ID (for Netlify functions)
- `TWITCH_APP_ACCESS_TOKEN` - IGDB/Twitch access token (for Netlify functions)

### Testing Approach

Currently, the project does not have a test suite implemented. When adding tests:
- Use Vitest for unit tests (React Testing Library compatible)
- Consider Playwright for E2E tests
- Mock Supabase client and IGDB API responses

### Common Development Tasks

1. **Adding a new page**: Create component in `/src/pages/`, add route in `App.tsx`
2. **Adding API endpoint**: Create function in `/netlify/functions/` or `/supabase/functions/`
3. **Database changes**: Add migration file in `/supabase/migrations/`
4. **State management**: Use Zustand stores in `/src/store/` for global state, Context for component trees

### Important Conventions

- All API calls should go through service layers in `/src/services/`
- Use TypeScript strict mode - ensure proper typing
- Follow existing component patterns - check similar components first
- Image URLs from IGDB need transformation via `igdb.ts` service
- Use Tailwind CSS for styling - avoid inline styles
- Implement error boundaries for robust error handling
- Always validate and sanitize user inputs

### Code Modification Guidelines

- For every file that you recommend changes to, please review the entire file before you give recommendations
- Prioritize accuracy over token/usage efficiency
- Prioritize streamlined, non-redundant file structure
- Don't provide code that changes styling or color scheme or other aesthetics without explicit permission
- Do not recommend creating new pages, files, routes, or functions when one already exists that serves the same or similar function