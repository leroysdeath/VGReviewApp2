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
                console.error('Please update your .env file with valid IGDB credentials');
                console.error('Visit https://dev.twitch.tv/console/apps to get credentials');
                return;
              }
              
              // Check for placeholder credentials
              if (env.VITE_IGDB_CLIENT_ID === 'your_client_id_here' || 
                  env.VITE_IGDB_ACCESS_TOKEN === 'your_access_token_here') {
                console.error('IGDB API credentials are still using placeholder values');
                console.error('Please update your .env file with valid IGDB credentials');
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
                if (proxyRes.statusCode === 401) {
                  console.error('Authentication failed - check your IGDB credentials');
                }
              }
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message);
              console.error('Request URL:', req.url);
              console.error('This might be due to invalid IGDB credentials or network issues');
            });
          }
        }
      }
    }
  }
})