import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../src/utils/idempotency';

const AUDD_URL = 'https://api.audd.io/';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function auddHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bodyBuffer = Buffer.concat(chunks);

    const token = process.env.AUDD_API_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Server missing AUDD_API_TOKEN' });
      return;
    }

    // Forward to AudD, injecting api_token
    const boundaryMatch = req.headers['content-type']?.toString().match(/boundary=(.*)$/);
    let fetchInit: RequestInit;
    if (boundaryMatch) {
      // multipart/form-data: append token as an extra field by reconstructing is non-trivial.
      // Simpler approach: rely on client not sending token and add it via query param.
      const url = new URL(AUDD_URL);
      url.searchParams.set('api_token', token);
      fetchInit = {
        method: 'POST',
        headers: { 'Content-Type': req.headers['content-type'] as string },
        body: bodyBuffer,
      };
      const response = await fetch(url.toString(), fetchInit);
      const text = await response.text();
      res.status(response.status).send(text);
    } else {
      // Assume JSON with { audio: base64 } or similar
      const payload = JSON.parse(bodyBuffer.toString('utf8'));
      payload.api_token = token;
      const response = await fetch(AUDD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (e: any) {
    res.status(500).json({ error: 'AudD proxy failed', message: e?.message });
  }
}

export default withIdempotency(auddHandler);

