import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      port: 5174,
      overlay: true
    },
    // Add headers to help with Service Worker caching issues
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  // Exclude manifest from dev server to prevent SW conflicts
  publicDir: process.env.NODE_ENV === 'development' ? false : 'public'
})