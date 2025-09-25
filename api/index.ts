import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import essential route handlers
import healthHandler from './health';
import playlistProxyHandler from './playlist-proxy';
import sessionsHandler from './sessions';
import spotifyTokenHandler from './spotify-token';

// Route mapping - core functionality only
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void> | void> = {
  '/api/health': healthHandler,
  '/api/playlist-proxy': playlistProxyHandler,
  '/api/sessions': sessionsHandler,
  '/api/spotify-token': spotifyTokenHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0] || '';
  const handler = routes[path];

  if (handler) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`API route ${path} error:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
}