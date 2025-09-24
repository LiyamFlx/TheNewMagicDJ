import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from './lib/supabaseServer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerSupabase(req.headers.authorization);

  try {
    const { data: user } = await supabase.auth.getUser();
    const user_id = user?.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    // Last 7 days summary by type
    const { data: events, error } = await supabase
      .from('events')
      .select('type, created_at')
      .gte(
        'created_at',
        new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      );

    if (error) return res.status(500).json({ error: error.message });

    const summary: Record<string, number> = {};
    for (const e of events || []) {
      summary[e.type] = (summary[e.type] || 0) + 1;
    }

    return res.status(200).json({ ok: true, summary });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown' });
  }
}
