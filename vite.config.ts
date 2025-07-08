import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Route all requests from /api/igdb/* to the actual IGDB API
        '/api/igdb': {
          target: 'https://api.igdb.com/v4',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/igdb\//, '/'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Ensure we have the required headers
              if (!env.VITE_IGDB_CLIENT_ID || !env.VITE_IGDB_ACCESS_TOKEN) {
                console.error('Missing IGDB API credentials in environment variables');
                return;
              }
              
              // Add IGDB API credentials to the proxied request
              proxyReq.setHeader('Client-ID', env.VITE_IGDB_CLIENT_ID);
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_IGDB_ACCESS_TOKEN}`);
              proxyReq.setHeader('Accept', 'application/json');
              proxyReq.setHeader('Content-Type', 'text/plain');
              
              console.log('Proxying request to IGDB:', req.url);
              console.log('Target URL:', `https://api.igdb.com/v4${req.url.replace('/api/igdb', '')}`);
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('IGDB API response status:', proxyRes.statusCode);
              if (proxyRes.statusCode >= 400) {
                console.error('IGDB API error response:', proxyRes.statusCode, proxyRes.statusMessage);
              }
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message);
              console.error('Request URL:', req.url);
            });
          }
        }
      }
    }
  }
})