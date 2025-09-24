# Lighthouse Performance Improvement Action Plan

## Performance Score: 60/100 (Current)
**Target: 85+/100**

## Critical Issues Identified

### 1. Cumulative Layout Shift (CLS) - Score: 0.02/100
**Current Value:** 0.965 (Poor - should be < 0.1)
**Impact:** Severe visual instability causing poor user experience

### 2. Largest Contentful Paint (LCP) - Score: 0.52/100
**Current Value:** 3.9s (Poor - should be < 2.5s)
**Impact:** Slow perceived loading speed

### 3. First Contentful Paint (FCP) - Score: 0.49/100
**Current Value:** 3.0s (Poor - should be < 1.8s)
**Impact:** Delayed initial content rendering

### 4. Unused JavaScript - Score: 0.47/100
**Potential Savings:** 147 KiB, 970ms
**Impact:** Unnecessary network payload and parse time

## Implementation Action Plan

### Phase 1: Fix Critical CLS Issues (Week 1)

#### Action 1.1: Implement Image Dimension Reservation
```typescript
// src/components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;  // Make required
  height: number; // Make required
  // ... other props
}

// Add aspect-ratio CSS for all game images
const imageStyles = {
  aspectRatio: `${width} / ${height}`,
  width: '100%',
  height: 'auto'
};
```

#### Action 1.2: Fix Dynamic Content Loading
```typescript
// src/components/GameCard.tsx
// Reserve space for dynamically loaded content
const GameCardSkeleton = () => (
  <div className="game-card-skeleton">
    <div className="h-[300px] bg-gray-200 animate-pulse" /> {/* Image placeholder */}
    <div className="h-[24px] bg-gray-200 animate-pulse mt-2" /> {/* Title */}
    <div className="h-[20px] bg-gray-200 animate-pulse mt-1 w-3/4" /> {/* Rating */}
  </div>
);
```

#### Action 1.3: Stabilize Font Loading
```css
/* src/index.css */
@font-face {
  font-family: 'Inter';
  font-display: swap; /* Prevent layout shift */
  src: url('/fonts/inter.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}
```

### Phase 2: Optimize Initial Load Performance (Week 2)

#### Action 2.1: Implement Critical CSS Inlining
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import criticalCSS from 'vite-plugin-critical';

export default defineConfig({
  plugins: [
    criticalCSS({
      pages: [
        { uri: '/', template: 'index.html' }
      ],
      css: ['dist/assets/*.css'],
      minify: true,
      extract: true
    })
  ]
});
```

#### Action 2.2: Code Split Heavy Components
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

// Split large route components
const GamePage = lazy(() => import('./pages/GamePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Wrap routes with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/game/:slug" element={<GamePage />} />
    <Route path="/profile/:username" element={<ProfilePage />} />
    <Route path="/search" element={<SearchPage />} />
  </Routes>
</Suspense>
```

#### Action 2.3: Optimize Bundle Size
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-icons'],
          'vendor-utils': ['date-fns', 'zod', 'immer']
        }
      }
    },
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  }
});
```

### Phase 3: Remove Unused JavaScript (Week 3)

#### Action 3.1: Analyze and Remove Dead Code
```bash
# Install bundle analyzer
npm install --save-dev vite-bundle-visualizer

# Add analysis script to package.json
"scripts": {
  "analyze": "vite-bundle-visualizer"
}

# Run analysis
npm run analyze
```

#### Action 3.2: Implement Dynamic Imports for Heavy Libraries
```typescript
// src/services/gameDataServiceV2.ts
// Instead of importing everything upfront
// import { igdbServiceV2 } from './igdbServiceV2';

// Use dynamic imports
const loadIGDBService = async () => {
  const { igdbServiceV2 } = await import('./igdbServiceV2');
  return igdbServiceV2;
};
```

#### Action 3.3: Remove Unused Service Imports
```typescript
// Review all 50+ services and remove unused imports
// src/services/index.ts
export {
  // Only export actually used services
  gameDataServiceV2,
  authService,
  userService,
  // Remove unused exports
  // gameSeeder, // Not used in production
  // searchDiagnosticService, // Debug only
};
```

### Phase 4: Image Optimization (Week 4)

#### Action 4.1: Implement Progressive Image Loading
```typescript
// src/components/LazyImage.tsx
const LazyImage = ({ src, alt, width, height }: ImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>();
  const [imageRef, isInView] = useIntersectionObserver();

  useEffect(() => {
    if (isInView) {
      // Load low quality first
      const lowQuality = src.replace('t_1080p', 't_thumb');
      setImageSrc(lowQuality);

      // Then load high quality
      const img = new Image();
      img.src = src;
      img.onload = () => setImageSrc(src);
    }
  }, [isInView, src]);

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
};
```

#### Action 4.2: Preload Critical Images
```typescript
// src/pages/HomePage.tsx
useEffect(() => {
  // Preload hero images
  const heroImages = [
    '/hero-image-1.jpg',
    '/hero-image-2.jpg'
  ];

  heroImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}, []);
```

## Monitoring & Validation

### Performance Metrics Dashboard
```typescript
// src/utils/performanceMonitor.ts
export const trackWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // Track CLS
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('CLS:', entry.value);
        // Send to analytics
      }
    }).observe({ type: 'layout-shift', buffered: true });

    // Track LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }
};
```

### Success Criteria
- [ ] CLS < 0.1 (Good)
- [ ] LCP < 2.5s (Good)
- [ ] FCP < 1.8s (Good)
- [ ] TBT < 200ms (Good)
- [ ] Overall Performance Score > 85

### Testing Protocol
1. Run Lighthouse after each phase implementation
2. Test on throttled 3G connection
3. Validate on real devices (mobile priority)
4. Monitor production metrics via Web Vitals

## Resource Requirements
- **Development Time:** 4 weeks (1 week per phase)
- **Testing Time:** 1 week comprehensive testing
- **Dependencies:** Bundle analyzer tools, performance monitoring

## Risk Mitigation
- **Rollback Plan:** Feature flag each optimization
- **A/B Testing:** Roll out to 10% of users first
- **Performance Budget:** Set alerts for regression
- **Continuous Monitoring:** Real User Monitoring (RUM) implementation

## Expected Outcomes
- **60% reduction** in CLS (0.965 → 0.1)
- **50% improvement** in LCP (3.9s → 2.0s)
- **40% reduction** in bundle size (147 KiB savings)
- **25+ point increase** in Lighthouse score (60 → 85+)