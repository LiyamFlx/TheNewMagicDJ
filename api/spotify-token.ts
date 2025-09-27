import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.VITE_SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Spotify credentials not configured'
      });
    }

    // Get Spotify token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      return res.status(503).json({
        error: 'SPOTIFY_AUTH_FAILED',
        message: 'Failed to get Spotify token'
      });
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 'private, max-age=3000');
    return res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in
    });

  } catch (e: any) {
    return res.status(500).json({
      error: 'SPOTIFY_TOKEN_ERROR',
      message: e?.message || 'Internal server error'
    });
  }
}