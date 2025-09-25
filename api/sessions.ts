import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getServerSupabase } from './lib/supabaseServer.js';

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(200),
  playlist_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization;
  const supabase = getServerSupabase(auth);
  const getUserId = async () => (await supabase.auth.getUser()).data?.user?.id;

  if (req.method === 'GET') {
    const user_id = await getUserId();
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { id, limit } = req.query as Record<string, string | undefined>;
    const resultLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

    let query = supabase.from('sessions').select('*').eq('user_id', user_id);
    if (id) query = query.eq('id', id);

    const { data, error } = await query
      .order('started_at', { ascending: false })
      .limit(resultLimit);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, sessions: data });
  }

  if (req.method === 'POST') {
    const raw =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, playlist_id } = CreateSessionSchema.parse(raw);
    const user_id = await getUserId();
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          user_id,
          playlist_id: playlist_id ?? null,
          status: 'active',
          started_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, session: data });
  }

  if (req.method === 'PATCH') {
    try {
      const user_id = await getUserId();
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

      const id = (req.query?.id as string) || '';
      if (!id) return res.status(400).json({ error: 'Missing id' });

      // Allow toggling status to completed; set ended_at
      const { status } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as { status?: 'active' | 'completed' };

      const updates: Record<string, any> = {};
      if (status === 'completed') {
        updates.status = 'completed';
        updates.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user_id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, session: data });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'unknown' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user_id = await getUserId();
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });
      const id = (req.query?.id as string) || '';
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
