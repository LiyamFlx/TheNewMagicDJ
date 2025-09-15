import type { VercelRequest, VercelResponse } from '@vercel/node';

const ACOUSTID_URL = 'https://api.acoustid.org/v2/lookup';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.ACOUSTID_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Server missing ACOUSTID_API_KEY' });
    return;
  }

  const { fingerprint, duration } = req.query;
  if (!fingerprint || !duration) {
    res.status(400).json({ error: 'Missing fingerprint or duration' });
    return;
  }

  const params = new URLSearchParams({
    client: key as string,
    meta: 'recordings+releasegroups+compress',
    fingerprint: fingerprint as string,
    duration: duration as string,
    format: 'json',
  });

  try {
    const response = await fetch(`${ACOUSTID_URL}?${params.toString()}`, {
      headers: { 'User-Agent': 'MagicDJ/1.0' },
    });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (e: any) {
    res.status(500).json({ error: 'AcoustID proxy failed', message: e?.message });
  }
}

