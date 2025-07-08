import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/igdb': {
        target: 'https://api.igdb.com/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/igdb/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Client-ID', process.env.VITE_IGDB_CLIENT_ID || '');
            proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_IGDB_ACCESS_TOKEN || ''}`);
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
