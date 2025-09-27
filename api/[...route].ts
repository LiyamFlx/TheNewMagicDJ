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
  // Build the API path from the route parameter
  const route = req.query.route as string | string[];
  const routePath = Array.isArray(route) ? route.join('/') : route;
  const apiPath = `/api/${routePath}`;

  const routeHandler = routes[apiPath];

  if (routeHandler) {
    try {
      await routeHandler(req, res);
    } catch (error) {
      console.error(`API route ${apiPath} error:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(404).json({
      error: 'API route not found',
      requestedPath: apiPath,
      availableRoutes: Object.keys(routes)
    });
  }
}