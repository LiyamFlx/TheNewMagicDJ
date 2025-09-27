import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // For now, just acknowledge the event without processing
    return res.status(200).json({
      ok: true,
      message: 'Event logged',
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    return res.status(500).json({
      error: 'EVENTS_ERROR',
      message: e?.message || 'Internal server error'
    });
  }
}