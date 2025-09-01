import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import strip from '@rollup/plugin-strip'

export default defineConfig({
  plugins: [
    react(),
    // Strip console statements in production
    process.env.NODE_ENV === 'production' && strip({
      include: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      functions: ['console.log', 'console.debug', 'console.info', 'console.warn'],
      // Keep console.error for production debugging
    })
  ].filter(Boolean),
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
      output: {
        // Simplified and working chunk splitting strategy
        manualChunks: {
          // React core (always needed)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase SDK
          'supabase': ['@supabase/supabase-js'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-icons'],
          // State management
          'state': ['zustand', 'immer'],
          // Forms and validation
          'forms': ['react-hook-form', 'zod'],
          // Data fetching
          'data': ['swr']
        },
        // Optimize chunk names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
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