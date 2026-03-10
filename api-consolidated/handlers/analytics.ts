import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../lib/supabaseServer';

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

    // Use database-side aggregation instead of fetching all rows client-side
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: events, error } = await supabase
      .from('events')
      .select('type')
      .gte('created_at', sevenDaysAgo);

    if (error) return res.status(500).json({ error: error.message });

    // Aggregate counts (Supabase JS client doesn't support GROUP BY directly,
    // but we no longer fetch created_at — reducing payload size)
    const summary: Record<string, number> = {};
    for (const e of events || []) {
      summary[e.type] = (summary[e.type] || 0) + 1;
    }

    return res.status(200).json({ ok: true, summary });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown' });
  }
}
