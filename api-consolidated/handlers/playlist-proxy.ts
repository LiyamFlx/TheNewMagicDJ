import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SecureSupabaseClient } from '../../lib/supabaseSecure';

function getServiceClient() {
  return SecureSupabaseClient.getAdminClient();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set JSON content type header first
  res.setHeader('Content-Type', 'application/json');

  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = getServiceClient();
  const method = req.method || 'GET';
  const action = (req.query.action as string) || (req.body as any)?.action;

  // Production error handling setup
  const startTime = Date.now();

  try {
    // Validate Supabase connection
    if (!process.env.VITE_SUPABASE_URL && !process.env.PUBLIC_SUPABASE_URL) {
      return res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'Supabase URL not configured',
        code: 'MISSING_SUPABASE_URL'
      });
    }
    if (!hasServiceKey && method !== 'GET') {
      res.setHeader('X-MagicDJ-Hint', 'Set SUPABASE_SERVICE_ROLE_KEY on server');
      return res.status(500).json({
        error: 'Server missing SUPABASE_SERVICE_ROLE_KEY. Cannot write to playlists with anon key under RLS.',
        code: 'MISSING_SERVICE_KEY'
      });
    }
    if (method === 'GET' && (action === 'list' || !action)) {
      const userId = (req.query.userId as string) || (req.query.user_id as string) || '';
      if (!userId) return res.status(400).json({
        error: 'Missing userId',
        code: 'MISSING_USER_ID'
      });

      const { data: playlists, error: playlistError } = await supabase
        .from('playlists')
        .select('id, user_id, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (playlistError) return res.status(500).json({
        error: playlistError.message,
        code: 'PLAYLIST_FETCH_ERROR'
      });

      const ids = (playlists || []).map(p => p.id);
      let tracksByPlaylist: Record<string, any[]> = {};
      if (ids.length > 0) {
        const { data: tracks } = await supabase
          .from('tracks')
          .select('id, playlist_id, title, artist, bpm, energy, duration, position, spotify_id, youtube_id')
          .in('playlist_id', ids)
          .order('created_at', { ascending: true });
        (tracks || []).forEach(t => {
          tracksByPlaylist[t.playlist_id] = tracksByPlaylist[t.playlist_id] || [];
          tracksByPlaylist[t.playlist_id].push(t);
        });
      }
      const combined = (playlists || []).map(p => ({ ...p, tracks: tracksByPlaylist[p.id] || [] }));
      return res.status(200).json({ ok: true, playlists: combined });
    }

    if (method === 'POST' && action === 'save') {
      let parsedBody;
      try {
        parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const { playlist, userId } = parsedBody;
      if (!playlist || !userId) return res.status(400).json({
        error: 'Missing payload',
        code: 'MISSING_PAYLOAD'
      });

      const payload = {
        id: playlist.id || undefined,
        name: String(playlist.name || '').trim(),
        user_id: userId,
        description: playlist.description || null,
      };
      const { data: saved, error: upsertErr } = await supabase
        .from('playlists')
        .upsert(payload)
        .select()
        .single();
      if (upsertErr) return res.status(500).json({
        error: upsertErr.message,
        code: 'PLAYLIST_SAVE_ERROR'
      });

      // Save tracks if provided
      const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
      if (tracks.length) {
        const sanitized = tracks.map((t: any, idx: number) => ({
          playlist_id: saved.id,
          title: t.title || 'Untitled',
          artist: t.artist || 'Unknown',
          bpm: typeof t.bpm === 'number' ? Math.floor(t.bpm) : null,
          energy: typeof t.energy === 'number' ? Math.floor(t.energy) : null,
          duration: typeof t.duration === 'number' ? Math.floor(t.duration) : 180,
          position: typeof t.position === 'number' ? t.position : idx,
          spotify_id: t.spotify_id ?? null,
          youtube_id: t.youtube_id ?? null,
          preview_url: t.preview_url ?? null,
          thumbnail: t.thumbnail ?? null,
          source_url: t.source_url ?? null,
        }));
        // Upsert in chunks to be safe
        const chunkSize = 500;
        for (let i = 0; i < sanitized.length; i += chunkSize) {
          const slice = sanitized.slice(i, i + chunkSize);
          const { error } = await supabase.from('tracks').upsert(slice);
          if (error) return res.status(500).json({
            error: error.message,
            code: 'TRACKS_SAVE_ERROR'
          });
        }
      }

      return res.status(200).json({ ok: true, playlist: { ...saved, tracks: playlist.tracks || [] } });
    }

    if (method === 'PATCH' && action === 'update') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const { id, updates, userId } = body;
      if (!id || !userId) return res.status(400).json({
        error: 'Missing id or userId',
        code: 'MISSING_ID_OR_USER_ID'
      });
      const patch: any = {};
      if (typeof updates?.name === 'string') patch.name = updates.name.trim();
      if (typeof updates?.description === 'string') patch.description = updates.description;
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('playlists')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) return res.status(500).json({
        error: error.message,
        code: 'PLAYLIST_UPDATE_ERROR'
      });
      return res.status(200).json({ ok: true, playlist: data });
    }

    if (method === 'DELETE' && (action === 'delete' || !action)) {
      let parsedBody = {};
      try {
        parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const id = (req.query.id as string) || parsedBody.id;
      const userId = (req.query.userId as string) || parsedBody.userId;
      if (!id) return res.status(400).json({
        error: 'Missing id',
        code: 'MISSING_ID'
      });
      const q = supabase.from('playlists').delete().eq('id', id);
      const { error } = userId ? await q.eq('user_id', userId) : await q;
      if (error) return res.status(500).json({
        error: error.message,
        code: 'PLAYLIST_DELETE_ERROR'
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error('[playlist-proxy] Error:', {
      error: e?.message || 'unknown',
      method,
      action,
      duration,
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    });

    // Return structured error response
    return res.status(500).json({
      error: 'PLAYLIST_OPERATION_FAILED',
      message: e?.message || 'Internal server error',
      code: e?.code || 'UNKNOWN_ERROR',
      duration,
      ...(process.env.NODE_ENV === 'development' && { stack: e?.stack })
    });
  }
}
