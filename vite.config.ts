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
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser', // Always use terser for better compression
    // Enhanced Terser options for maximum compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'],
        passes: 3, // Multiple compression passes for better results
        ecma: 2015, // Enable ES6 optimizations
        module: true, // Enable module optimizations
        toplevel: true, // Enable top-level variable and function name mangling
        unsafe_arrows: true, // Convert ES5 functions to arrow functions
        unsafe_comps: true, // Compress comparisons
        unsafe_methods: true, // Convert methods to arrow functions
        unsafe_proto: true, // Optimize prototype access
        unsafe_regexp: true, // Optimize regular expressions
        unsafe_undefined: true, // Substitute undefined with void 0
        conditionals: true, // Optimize conditionals
        dead_code: true, // Remove dead code
        evaluate: true, // Evaluate constant expressions
        inline: true, // Inline functions
        loops: true, // Optimize loops
        unused: true, // Drop unused variables/functions
        hoist_funs: true, // Hoist function declarations
        if_return: true, // Optimize if-return sequences
        join_vars: true, // Join variable declarations
        reduce_vars: true, // Reduce variable assignments
        side_effects: true, // Remove side-effect-free statements
        switches: true, // Optimize switch statements
      },
      mangle: {
        safari10: true, // Work around Safari 10 bugs
        toplevel: true, // Mangle top-level names
        properties: {
          regex: /^_/ // Mangle properties starting with underscore
        }
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
  resolve: {
    alias: {
      // Node.js polyfills for browser compatibility
      events: 'events',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      stream: 'stream-browserify'
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    // Define global variables for browser (required by some Node.js polyfills)
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.browser': 'true',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'zustand',
      // Node.js polyfills for browser compatibility
      'events',
      'buffer',
      'process/browser',
      'util',
      'stream-browserify'
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