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
          rewrite: (path) => path.replace(/^\/api\/igdb/, ''),
          configure: (proxy, options) => {
            // Add any additional headers if needed
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add IGDB API credentials to the proxied request
              proxyReq.setHeader('Client-ID', env.VITE_IGDB_CLIENT_ID || '');
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_IGDB_ACCESS_TOKEN || ''}`);
              console.log('Proxying request to IGDB:', req.url);
              console.log('Using Client-ID:', env.VITE_IGDB_CLIENT_ID ? 'Set' : 'Missing');
              console.log('Using Access Token:', env.VITE_IGDB_ACCESS_TOKEN ? 'Set' : 'Missing');
            });
          }
        }
      }
    }
  }
})