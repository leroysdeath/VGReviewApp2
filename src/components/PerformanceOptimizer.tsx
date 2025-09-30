/**
 * Performance Optimizer Component
 * Adds resource hints and prefetching for improved performance
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const PerformanceOptimizer: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Prefetch likely next routes based on current route
    const prefetchRoutes = () => {
      const currentPath = location.pathname;

      // Define route relationships for intelligent prefetching
      const routePrefetchMap: Record<string, string[]> = {
        '/': ['/explore', '/search', '/users'], // Landing page -> common next destinations
        '/explore': ['/game/', '/search'], // Explore -> game pages
        '/search': ['/game/'], // Search -> game pages
        '/users': ['/user/'], // Users list -> user profiles
        '/game/': ['/review/', '/user/'], // Game page -> reviews and user profiles
        '/user/': ['/game/', '/review/'], // User profile -> games and reviews
      };

      // Find matching route pattern
      const matchingRoute = Object.keys(routePrefetchMap).find(route =>
        currentPath.startsWith(route)
      );

      if (matchingRoute && routePrefetchMap[matchingRoute]) {
        // Prefetch JavaScript chunks for likely next routes
        routePrefetchMap[matchingRoute].forEach(route => {
          prefetchRoute(route);
        });
      }
    };

    // Prefetch a route's JavaScript chunk
    const prefetchRoute = (route: string) => {
      // Map routes to their chunk names (based on our lazy loading setup)
      const routeChunkMap: Record<string, string> = {
        '/explore': 'ExplorePage',
        '/search': 'SearchResultsPage',
        '/users': 'UserSearchPage',
        '/game/': 'GamePage',
        '/user/': 'UserPage',
        '/review/': 'ReviewFormPage',
      };

      const chunkName = routeChunkMap[route];
      if (!chunkName) return;

      // Use a data attribute to check if already prefetched
      const prefetchKey = `data-prefetch-${chunkName}`;
      if (document.querySelector(`[${prefetchKey}]`)) return;

      // Instead of trying to prefetch specific chunks (which have dynamic hashes),
      // prefetch the route URL itself - the browser will handle chunk loading
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route === '/game/' ? '/game/1' : route === '/user/' ? '/user/1' : route;
      link.setAttribute(prefetchKey, 'true');

      document.head.appendChild(link);
    };

    // Prefetch critical API endpoints
    const prefetchAPI = () => {
      // Prefetch common API endpoints that are likely to be needed
      const apiEndpoints = [
        `${SUPABASE_URL}/rest/v1/game?select=*&limit=20`,
        `${SUPABASE_URL}/rest/v1/user?select=*&limit=10`,
      ];

      apiEndpoints.forEach(endpoint => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = new URL(endpoint).origin;

        // Check if already added
        if (!document.querySelector(`link[href="${link.href}"][rel="dns-prefetch"]`)) {
          document.head.appendChild(link);
        }
      });
    };

    // Preload critical images for the current route
    const preloadImages = () => {
      // Determine critical images based on route
      const routeImageMap: Record<string, string[]> = {
        '/': ['/hero-bg.webp', '/logo.svg'],
        '/explore': ['/placeholder-game.svg'],
        '/search': ['/placeholder-game.svg'],
      };

      const matchingRoute = Object.keys(routeImageMap).find(route =>
        location.pathname.startsWith(route)
      );

      if (matchingRoute && routeImageMap[matchingRoute]) {
        routeImageMap[matchingRoute].forEach(imageSrc => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = imageSrc;

          // Check if already preloaded
          if (!document.querySelector(`link[href="${imageSrc}"][rel="preload"]`)) {
            document.head.appendChild(link);
          }
        });
      }
    };

    // Run optimizations with a slight delay to not interfere with initial load
    const optimizationTimer = setTimeout(() => {
      prefetchRoutes();
      prefetchAPI();
      preloadImages();
    }, 2000); // 2 second delay after route change

    return () => clearTimeout(optimizationTimer);
  }, [location]);

  // Add intersection observer for prefetching visible links
  useEffect(() => {
    const prefetchVisibleLinks = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const link = entry.target as HTMLAnchorElement;
              const href = link.href;

              // Prefetch internal links
              if (href && href.includes(window.location.origin)) {
                const prefetchLink = document.createElement('link');
                prefetchLink.rel = 'prefetch';
                prefetchLink.href = href;

                // Check if already prefetched
                if (!document.querySelector(`link[href="${href}"][rel="prefetch"]`)) {
                  document.head.appendChild(prefetchLink);
                }

                // Stop observing this link
                observer.unobserve(link);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Start prefetching when link is 50px away from viewport
        }
      );

      // Observe all internal links
      const links = document.querySelectorAll('a[href^="/"]');
      links.forEach(link => observer.observe(link));

      return () => observer.disconnect();
    };

    // Start observing after a delay
    const observerTimer = setTimeout(prefetchVisibleLinks, 3000);

    return () => clearTimeout(observerTimer);
  }, [location]);

  // No visual output - this is a performance optimization component
  return null;
};

/**
 * Hook to manually trigger prefetch for a specific route
 */
export const usePrefetch = () => {
  const prefetch = (path: string) => {
    // Create prefetch link
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;

    if (!document.querySelector(`link[href="${path}"][rel="prefetch"]`)) {
      document.head.appendChild(link);
    }
  };

  const prefetchImage = (src: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;

    if (!document.querySelector(`link[href="${src}"][rel="preload"]`)) {
      document.head.appendChild(link);
    }
  };

  return { prefetch, prefetchImage };
};