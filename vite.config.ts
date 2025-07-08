import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Remove the proxy configuration since we're now using Supabase Edge Functions
  server: {
    port: 5173,
    host: true
  }
})