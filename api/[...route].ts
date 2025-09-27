import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import all route handlers from api-consolidated
import healthHandler from '../api-consolidated/handlers/health';
import playlistProxyHandler from '../api-consolidated/handlers/playlist-proxy';
import sessionsHandler from '../api-consolidated/handlers/sessions';
import spotifyTokenHandler from '../api-consolidated/handlers/spotify-token';
import generateMagicSetHandler from '../api-consolidated/handlers/generate-magic-set';
import youtubeSearchHandler from '../api-consolidated/handlers/youtube-search';
import analyticsHandler from '../api-consolidated/handlers/analytics';
import eventsHandler from '../api-consolidated/handlers/events';
import auddHandler from '../api-consolidated/handlers/audd';
import acoustidHandler from '../api-consolidated/handlers/acoustid';

// Route mapping - all API endpoints
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any> | any> = {
  '/api/health': healthHandler,
  '/api/playlist-proxy': playlistProxyHandler,
  '/api/sessions': sessionsHandler,
  '/api/spotify-token': spotifyTokenHandler,
  '/api/generate-magic-set': generateMagicSetHandler,
  '/api/youtube-search': youtubeSearchHandler,
  '/api/analytics': analyticsHandler,
  '/api/events': eventsHandler,
  '/api/audd': auddHandler,
  '/api/acoustid': acoustidHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Build the API path from the route parameter
    const route = req.query.route as string | string[];
    const routePath = Array.isArray(route) ? route.join('/') : (route || '');
    const apiPath = `/api/${routePath}`;

    console.log(`[API Router] Processing request: ${req.method} ${req.url}`);
    console.log(`[API Router] Route param:`, route);
    console.log(`[API Router] Constructed path:`, apiPath);
    console.log(`[API Router] Available routes:`, Object.keys(routes));

    const routeHandler = routes[apiPath];

    if (routeHandler) {
      console.log(`[API Router] Found handler for ${apiPath}`);
      await routeHandler(req, res);
    } else {
      console.log(`[API Router] No handler found for ${apiPath}`);
      res.status(404).json({
        error: 'API route not found',
        requestedPath: apiPath,
        routeParam: route,
        url: req.url,
        availableRoutes: Object.keys(routes)
      });
    }
  } catch (error) {
    console.error(`[API Router] Top-level error:`, error);
    res.status(500).json({
      error: 'Router error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}