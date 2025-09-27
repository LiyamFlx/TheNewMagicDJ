import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    message: 'Simple health check working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}