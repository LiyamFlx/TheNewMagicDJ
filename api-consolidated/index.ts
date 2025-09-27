import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import essential route handlers
import healthHandler from './handlers/health';
import playlistProxyHandler from './handlers/playlist-proxy';
import sessionsHandler from './handlers/sessions';
import spotifyTokenHandler from './handlers/spotify-token';

// Route mapping - core functionality only
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any> | any> = {
  '/api/health': healthHandler,
  '/api/playlist-proxy': playlistProxyHandler,
  '/api/sessions': sessionsHandler,
  '/api/spotify-token': spotifyTokenHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the API path from query parameter (passed by rewrite)
  const pathParam = req.query.path as string;
  const apiPath = pathParam || '/api/health';

  const handler = routes[apiPath];

  if (handler) {
    try {
      await handler(req, res);
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