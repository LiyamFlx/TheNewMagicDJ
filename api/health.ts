import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      message: 'Health check working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'unknown' });
  }
}