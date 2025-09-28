import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import { vitePluginCSPGuard } from './plugins/vite-plugin-csp-guard'

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