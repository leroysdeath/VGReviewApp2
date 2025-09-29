import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import { vitePluginCSPGuard } from './plugins/vite-plugin-csp-guard'
import { visualizer } from 'rollup-plugin-visualizer'

// Image optimization configuration
const imageOptimizationConfig = {
  // Patterns for image assets to be processed
  include: /\.(jpg|jpeg|png|gif|svg)$/,

  // Output formats configuration
  formats: {
    webp: { quality: 85 },
    avif: { quality: 75 }
  },

  // Responsive sizes to generate
  sizes: [320, 640, 768, 1024, 1280, 1920]
};

export default defineConfig({
  plugins: [
    react(),
    // CSP hash generation for inline scripts
    vitePluginCSPGuard({
      outputFile: 'dist/csp-hashes.json',
      algorithm: 'sha256',
      verbose: process.env.NODE_ENV === 'development'
    }),
    // Bundle analyzer - generates stats.html in dist folder
    visualizer({
      filename: 'dist/stats.html',
      open: false, // Don't auto-open the report
      gzipSize: true,
      brotliSize: true,
      template: 'sunburst' // or 'treemap', 'network'
    }),
    // Progressive image optimization:
    // - IGDB images are already optimized via their CDN
    // - Local images (heroes, placeholders) are processed at build time
    imagetools({
      // Default output formats for imported images
      defaultDirectives: () => {
        return new URLSearchParams({
          format: 'webp;avif;original',
          quality: '85',
          // Generate multiple widths for responsive images
          w: '320;640;768;1024;1280;1920',
          as: 'picture'
        })
      },
      // Exclude IGDB and external URLs from processing
      exclude: [
        '**/*.svg', // SVGs don't need conversion
        '**/node_modules/**',
        '**/*.{woff,woff2,ttf,otf,eot}', // Fonts
        /igdb\.com/, // IGDB images already optimized
        /^https?:\/\// // External URLs
      ],
      // Remove default query params from output filenames for cleaner URLs
      removeMetadata: true
    })
  ],
  server: {
    port: 5173,
    host: true,
    strictPort: true
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    // Dynamic sourcemap and minify based on environment
    sourcemap: false, // Disabled for production
    minify: 'terser', // Always use terser for better compression
    // Enhanced Terser options for maximum compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'],
        passes: 2, // Reduced from 3 to avoid over-optimization
        ecma: 2015,
        module: true,
        // Disabled aggressive optimizations that can cause initialization issues
        toplevel: false, // Don't mangle top-level names (was true)
        unsafe_arrows: false, // Don't convert functions (was true)
        unsafe_comps: false, // Don't compress comparisons (was true)
        unsafe_methods: false, // Don't convert methods (was true)
        unsafe_proto: false, // Don't optimize prototype (was true)
        unsafe_regexp: false, // Don't optimize regexp (was true)
        unsafe_undefined: false, // Don't substitute undefined (was true)
        conditionals: true,
        dead_code: true,
        evaluate: true,
        inline: 2, // Limit inline level (was true/3)
        loops: true,
        unused: true,
        hoist_funs: false, // Don't hoist functions (was true) - can cause init issues
        if_return: true,
        join_vars: false, // Don't join vars (was true) - can cause init issues
        reduce_vars: false, // Don't reduce vars (was true) - can cause init issues
        side_effects: false, // Don't remove side effects (was true)
        switches: true,
      },
      mangle: {
        safari10: true, // Work around Safari 10 bugs
        toplevel: false, // Don't mangle top-level names to avoid init issues
        // Removed property mangling as it can break runtime access
      },
      format: {
        comments: false, // Remove all comments
        ecma: 2015, // Use ES6 formatting
        ascii_only: true // Escape non-ASCII characters
      }
    },
    // Optimize build size
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Improved chunk naming for better caching
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // Organize assets by type
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];

          // Organize images into their own directory
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }

          // Organize fonts
          if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }

          // Default for other assets
          return 'assets/[name]-[hash][extname]';
        },
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          // Core vendor libraries that rarely change
          if (id.includes('node_modules')) {
            // React ecosystem and ALL React-dependent libraries must be together
            // This prevents "useLayoutEffect of undefined" errors
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('react-hook-form') ||
              id.includes('react-datepicker') ||
              id.includes('react-helmet') ||
              id.includes('react-hot-toast') ||
              id.includes('react-icons') ||
              id.includes('react-select') ||
              id.includes('react-slider') ||
              id.includes('react-swipeable') ||
              id.includes('react-virtualized') ||
              id.includes('react-window') ||
              id.includes('@emotion') ||  // Emotion needs React
              id.includes('@hello-pangea') ||  // DnD library needs React
              id.includes('@dnd-kit') ||  // DnD library needs React
              id.includes('@use-gesture') ||  // Gesture library needs React
              id.includes('@hookform') ||  // Hook form related
              id.includes('lucide-react') ||  // Icon library needs React
              id.includes('@headlessui') ||  // Headless UI needs React
              id.includes('@heroicons') ||  // Hero icons might need React
              id.includes('focus-trap-react') ||  // Focus trap needs React
              id.includes('@testing-library/react') ||  // Testing library needs React
              id.includes('use-sync-external-store') ||  // React 18 compatibility
              id.includes('scheduler') ||  // React scheduler
              id.includes('zustand') ||  // Zustand uses React hooks
              id.includes('swr') ||  // SWR uses React hooks
              id.includes('@tanstack/react-query') ||  // React Query if used
              id.includes('zod') ||  // Zod validation (needed by @hookform/resolvers)
              id.includes('yup') ||  // Yup validation if used
              id.includes('joi')  // Joi validation if used
            ) {
              return 'vendor-react';
            }

            // Supabase SDK - large but essential (no React dependency)
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // Date/time libraries (only non-React ones)
            if (id.includes('date-fns')) {
              return 'vendor-datetime';
            }

            // State management (only truly non-React ones)
            if (id.includes('immer')) {
              return 'vendor-state';
            }

            // Note: zustand and swr are moved to vendor-react chunk since they use React hooks

            // Data fetching (only non-React specific)
            if (id.includes('axios')) {
              return 'vendor-data';
            }

            // Markdown and rich text (non-React specific)
            if (id.includes('marked') || id.includes('dompurify') || id.includes('highlight')) {
              return 'vendor-markdown';
            }

            // All other vendor libraries
            return 'vendor-misc';
          }

          // Application code chunking
          if (id.includes('/src/')) {
            // Services layer
            if (id.includes('/services/')) {
              return 'app-services';
            }

            // Hooks
            if (id.includes('/hooks/')) {
              return 'app-hooks';
            }

            // Utils
            if (id.includes('/utils/')) {
              return 'app-utils';
            }

            // Store/Context
            if (id.includes('/store/') || id.includes('/context/')) {
              return 'app-state';
            }

            // Components (shared components that aren't page-specific)
            if (id.includes('/components/') && !id.includes('/pages/')) {
              return 'app-components';
            }
          }
        }
      }
    },
    // Additional optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js',
      'lucide-react',
      'zustand'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  // Optimize CSS
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    modules: {
      localsConvention: 'camelCase'
    }
  }
})