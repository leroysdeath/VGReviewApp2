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
            // React ecosystem - fundamental dependencies
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // Supabase SDK - large but essential
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // UI libraries
            if (id.includes('lucide-react') || id.includes('@headlessui') || id.includes('@heroicons')) {
              return 'vendor-ui-icons';
            }

            // Date/time libraries
            if (id.includes('date-fns') || id.includes('react-datepicker')) {
              return 'vendor-datetime';
            }

            // Form and validation
            if (id.includes('react-hook-form') || id.includes('yup') || id.includes('formik')) {
              return 'vendor-forms';
            }

            // State management
            if (id.includes('zustand') || id.includes('immer')) {
              return 'vendor-state';
            }

            // Data fetching
            if (id.includes('swr') || id.includes('axios')) {
              return 'vendor-data';
            }

            // Markdown and rich text
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