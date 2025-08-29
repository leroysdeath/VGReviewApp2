import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    // Optimize build size
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Tree-shaking configuration
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        // Improved chunk splitting strategy
        manualChunks: (id) => {
          // Core vendor chunk (rarely changes, cached longer)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'icons';
            }
            if (id.includes('zustand') || id.includes('immer')) {
              return 'state';
            }
            if (id.includes('swr') || id.includes('@tanstack')) {
              return 'data-fetching';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms';
            }
            // All other node_modules in vendor chunk
            return 'vendor';
          }
          
          // Feature-based chunks for application code
          if (id.includes('src/components/profile') || id.includes('src/pages/Profile') || id.includes('src/pages/User')) {
            return 'profile';
          }
          if (id.includes('src/components/Game') || id.includes('src/pages/Game')) {
            return 'games';
          }
          if (id.includes('src/components/Review') || id.includes('src/pages/Review')) {
            return 'reviews';
          }
          if (id.includes('src/services')) {
            return 'services';
          }
        },
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-${facadeModuleId}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Optimize entry file name
        entryFileNames: 'assets/[name]-[hash].js'
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