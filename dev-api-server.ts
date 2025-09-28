#!/usr/bin/env tsx

import http from 'http';
import url from 'url';
import path from 'path';

// Simple development API server for the MagicDJ project
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);

  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Route API requests to handlers
  if (pathname.startsWith('/api/')) {
    const endpoint = pathname.substring(5); // Remove '/api/'

    try {
      let handlerModule;

      // Handle specific endpoints using dynamic import
      let handlerPath;
      if (endpoint.startsWith('playlist-proxy')) {
        handlerPath = './api-consolidated/handlers/playlist-proxy.ts';
      } else if (endpoint === 'generate-magic-set') {
        handlerPath = './api-consolidated/handlers/generate-magic-set.ts';
      } else {
        handlerPath = `./api-consolidated/handlers/${endpoint}.ts`;
      }

      try {
        // Use dynamic import for ES modules
        handlerModule = await import(handlerPath);
      } catch (e) {
        console.error(`Failed to import ${handlerPath}:`, e.message);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `API endpoint not found: ${endpoint}` }));
        return;
      }

      const handler = handlerModule.default || handlerModule;

      if (!handler || typeof handler !== 'function') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid handler function' }));
        return;
      }

      // Collect request body
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          // Parse body if it's JSON
          let parsedBody;
          if (body) {
            try {
              parsedBody = JSON.parse(body);
            } catch (e) {
              parsedBody = body;
            }
          }

          // Create mock Vercel request object
          const mockReq = {
            method: req.method,
            url: req.url,
            query: parsedUrl.query,
            body: parsedBody || {},
            headers: req.headers
          };

          // Create mock Vercel response object
          const mockRes = {
            status: (code: number) => ({
              json: (data: any) => {
                res.writeHead(code, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              }
            }),
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            json: (data: any) => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            }
          };

          // Call the handler
          await handler(mockReq, mockRes);
        } catch (error) {
          console.error('Handler error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
          }));
        }
      });
    } catch (error) {
      console.error('API routing error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API routing error', message: error.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 API development server running on http://localhost:${port}`);
  console.log(`📡 Ready to serve API endpoints from api-consolidated/handlers/`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down API server...');
  server.close(() => {
    process.exit(0);
  });
});