import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
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
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    // Terser options to remove console statements in production
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn']
      }
    },
    // Optimize build size
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Standard chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
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