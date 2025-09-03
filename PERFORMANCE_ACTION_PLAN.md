# Performance Improvement Action Plan

**Created:** September 2, 2025  
**Goal:** Achieve 95/100 Lighthouse Performance Score  
**Current Score:** 85/100  
**Target Improvement:** +10 points

---

## Phase 1: Immediate Quick Wins (30 minutes, +8 points)

### 1. Add Resource Hints (+3 points)
**File to Edit:** `src/components/SEOHead.tsx`

Add these preconnect and DNS prefetch hints after line 93:

```typescript
// Add after line 93 in SEOHead.tsx
{/* Performance: Additional resource hints */}
<link rel="dns-prefetch" href="https://api.igdb.com" />
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link rel="preconnect" href="https://images.pexels.com" />

{/* Prefetch critical API endpoints */}
<link rel="prefetch" href={`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/game?limit=20`} />
```

### 2. Optimize Font Loading (+2 points)
**File to Create:** `src/styles/fonts.css`

```css
/* Create new file: src/styles/fonts.css */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap; /* Key optimization */
  src: url('/fonts/inter-400.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/inter-600.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/inter-700.woff2') format('woff2');
}
```

**File to Edit:** `src/index.css`

Add at the top of the file:
```css
/* Add at line 1 */
@import './styles/fonts.css';
```

### 3. Deploy Console Removal (+3 points)
**File to Edit:** `vite.config.ts`

Add terser configuration after line 31:

```typescript
// Add after line 31 in build config
build: {
  // ... existing config
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn']
    },
    format: {
      comments: false
    }
  }
}
```

---

## Phase 2: Route-Based Code Splitting (1 hour, +5 points)

### 1. Lazy Load Main Routes
**File to Edit:** `src/App.tsx`

Replace imports at the top (lines 3-17) with:

```typescript
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import Footer from './components/Footer';
import { SEOHead } from './components/SEOHead';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load all main routes
const ResponsiveLandingPage = lazy(() => import('./components/ResponsiveLandingPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const UserPage = lazy(() => import('./pages/UserPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));

// Keep legal pages lazy loaded as they are
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
```

Update route components to use Suspense (around line 140-180):

```typescript
// Wrap each route in Suspense
<Route path="/" element={
  <Suspense fallback={<LoadingSpinner />}>
    <ResponsiveLandingPage />
  </Suspense>
} />

<Route path="/search" element={
  <Suspense fallback={<LoadingSpinner />}>
    <SearchPage />
  </Suspense>
} />

<Route path="/game/:id" element={
  <Suspense fallback={<LoadingSpinner />}>
    <GamePage />
  </Suspense>
} />

// Repeat for all routes...
```

### 2. Create Loading Component
**File to Create:** `src/components/LoadingSpinner.tsx`

```typescript
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    </div>
  );
};
```

---

## Phase 3: Critical CSS Extraction (1 hour, +3 points)

### 1. Install Critical CSS Plugin
**File to Edit:** `package.json`

Add to devDependencies:
```json
"vite-plugin-critical": "^1.0.6"
```

### 2. Configure Critical CSS
**File to Edit:** `vite.config.ts`

Add import at top:
```typescript
import critical from 'vite-plugin-critical';
```

Add to plugins array (after react plugin):
```typescript
plugins: [
  react(),
  critical({
    base: './',
    src: 'index.html',
    target: {
      html: 'index.html',
      css: 'critical.css'
    },
    inline: true,
    minify: true,
    extract: false,
    width: 1920,
    height: 1080,
    penthouse: {
      blockJSRequests: false
    }
  })
]
```

---

## Phase 4: Component-Level Optimizations (2 hours, +4 points)

### 1. Create Intersection Observer Hook
**File to Create:** `src/hooks/useIntersectionObserver.ts`

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: string;
}

export const useIntersectionObserver = ({
  threshold = 0,
  rootMargin = '100px'
}: UseIntersectionObserverProps = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
};
```

### 2. Optimize Heavy Components
**File to Edit:** `src/components/ReviewCard.tsx`

Add lazy loading for below-fold content:

```typescript
// Add import at top
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

// Inside component, add:
const { ref, isVisible } = useIntersectionObserver();

// Wrap non-critical content:
<div ref={ref}>
  {isVisible ? (
    <ReviewInteractions review={review} />
  ) : (
    <div className="h-12" /> {/* Placeholder */}
  )}
</div>
```

### 3. Implement Virtual Scrolling for Review Lists
**File to Edit:** `src/pages/UsersPage.tsx`

Add react-window for virtual scrolling:

```typescript
// Add import
import { FixedSizeList } from 'react-window';

// Replace review list mapping (around line 200-250) with:
<FixedSizeList
  height={600}
  itemCount={reviews.length}
  itemSize={150} // Approximate height of ReviewCard
  width="100%"
  className="scrollbar-thin scrollbar-thumb-gray-600"
>
  {({ index, style }) => (
    <div style={style}>
      <ReviewCard 
        review={reviews[index]} 
        compact={isMobile}
        currentUserId={user?.id}
      />
    </div>
  )}
</FixedSizeList>
```

---

## Phase 5: Bundle Size Optimization (2 hours, +3 points)

### 1. Tree-Shake Icon Imports
**Files to Edit:** All files importing from 'lucide-react'

Replace wildcard imports:
```typescript
// OLD - Don't do this
import * as Icons from 'lucide-react';

// NEW - Do this instead
import { Search, User, Menu, X, Star } from 'lucide-react';
```

**Specific files to update:**
- `src/components/ResponsiveNavbar.tsx` (line 3)
- `src/components/ResponsiveLandingPage.tsx` (line 3)
- `src/components/ReviewCard.tsx`
- `src/pages/GamePage.tsx`

### 2. Dynamic Import for Heavy Libraries
**File to Edit:** `src/components/ReviewEditor.tsx` (if exists)

```typescript
// Dynamically import heavy editor libraries
const loadEditor = async () => {
  const { Editor } = await import('@tiptap/react');
  const StarterKit = await import('@tiptap/starter-kit');
  return { Editor, StarterKit };
};
```

### 3. Optimize Supabase Imports
**File to Create:** `src/services/supabaseOptimized.ts`

```typescript
// Only import what we actually use
import { createClient } from '@supabase/supabase-js/dist/module/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Phase 6: Network Optimization (1 hour, +2 points)

### 1. Add Request Batching
**File to Create:** `src/utils/requestBatcher.ts`

```typescript
class RequestBatcher {
  private queue: Map<string, Promise<any>> = new Map();
  private timeout: NodeJS.Timeout | null = null;

  batch<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.queue.has(key)) {
      return this.queue.get(key) as Promise<T>;
    }

    const promise = request();
    this.queue.set(key, promise);

    // Clear from queue after resolution
    promise.finally(() => {
      setTimeout(() => this.queue.delete(key), 100);
    });

    return promise;
  }
}

export const requestBatcher = new RequestBatcher();
```

### 2. Configure Netlify Headers
**File to Edit:** `netlify.toml`

Add aggressive caching and compression:

```toml
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Encoding = "br"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Encoding = "br"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/"
  [headers.values]
    Link = '''
    </assets/index.css>; rel=preload; as=style,
    </assets/index.js>; rel=preload; as=script
    '''
```

---

## Implementation Checklist

### Immediate (Today - 30 minutes)
- [ ] Add resource hints to SEOHead.tsx
- [ ] Create fonts.css with font-display: swap
- [ ] Verify terser config in vite.config.ts

### Priority 1 (This Week - 2 hours)
- [ ] Implement route-based code splitting in App.tsx
- [ ] Create LoadingSpinner component
- [ ] Add critical CSS extraction

### Priority 2 (Next Week - 3 hours)
- [ ] Create useIntersectionObserver hook
- [ ] Add virtual scrolling to UsersPage
- [ ] Tree-shake all icon imports

### Priority 3 (Following Week - 2 hours)
- [ ] Optimize bundle imports
- [ ] Add request batching
- [ ] Configure Netlify headers

---

## Validation Steps

After each phase:

1. **Build and analyze:**
```bash
npm run build
npx vite-bundle-visualizer
```

2. **Test with Lighthouse:**
```bash
npm run preview
# Open Chrome DevTools > Lighthouse > Run audit
```

3. **Check metrics:**
- Bundle size < 200KB initial
- First Paint < 1.5s
- Time to Interactive < 3s
- 0 console statements in production

---

## Expected Results

| Metric | Current | After Phase 1 | After Phase 2 | Final Target |
|--------|---------|---------------|---------------|--------------|
| Lighthouse Performance | 85 | 93 | 95 | 95+ |
| Initial Bundle (KB) | 380 | 380 | 180 | 150 |
| Time to Interactive (s) | 2.8 | 2.4 | 2.0 | 1.8 |
| First Paint (s) | 1.6 | 1.3 | 1.1 | 1.0 |

---

## Rollback Plan

If any optimization causes issues:

1. **Git revert the specific commit**
2. **Remove the optimization from vite.config.ts**
3. **Clear CDN cache if needed**
4. **Redeploy to Netlify**

Each optimization is independent and can be rolled back without affecting others.