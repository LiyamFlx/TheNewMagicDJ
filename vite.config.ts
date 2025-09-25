import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Serve placeholder PWA icons in dev to avoid console errors from cached manifests
    {
      name: 'dev-pwa-icon-middleware',
      apply: 'serve',
      configureServer(server) {
        const onePxPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABo7n+SAAAAABJRU5ErkJggg==',
          'base64'
        );
        server.middlewares.use((req, res, next) => {
          if (req.url === '/icon-192.png' || req.url === '/icon-512.png') {
            res.setHeader('Content-Type', 'image/png');
            res.end(onePxPng);
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
    hmr: {
      overlay: true
    },
    proxy: {
      // Forward API calls to the Vercel serverless runtime during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
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
  // Serve public/ normally; manifest is injected only in production from index.html
  publicDir: 'public'
})
