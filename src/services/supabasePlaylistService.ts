// Supabase playlist service
import { supabase } from "../lib/supabase";
import { AppError } from "../utils/errors";

// simple in-memory cache for a short TTL to reduce DB pressure
const cache = new Map<string, { data: any; expiry: number }>();
const TTL_MS = 15_000; // 15 seconds
function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  if (entry) cache.delete(key);
  return null;
}
function setCached(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + TTL_MS });
}

export const supabasePlaylistService = {
  async savePlaylist(playlist: any, userId: string) {
    try {
      console.log('Saving playlist:', { playlistId: playlist.id, name: playlist.name, userId, trackCount: playlist.tracks?.length });

      const { id: playlistId, name, tracks } = playlist;

      if (!userId) {
        throw new AppError('BAD_REQUEST', 'User ID is required');
      }

      if (!name || !name.trim()) {
        throw new AppError('BAD_REQUEST', 'Playlist name is required');
      }

      // 1. Insert/Update the playlist (use insert with conflict resolution)
      const playlistPayload = {
        id: playlistId || undefined, // Let Supabase generate UUID if not provided
        name: name.trim(),
        user_id: userId,
        description: playlist.description || null
      };

      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .insert(playlistPayload)
        .select()
        .single();

      if (playlistError) {
        console.error('Supabase playlist save error:', playlistError);
        throw new AppError('UPSTREAM_ERROR', 'Failed to save playlist', { details: { playlistError } });
      }

      console.log('Playlist saved:', playlistData);

      // 2. Insert tracks if provided
      if (tracks && tracks.length > 0) {
        const trackData = tracks.map((track: any) => ({
          playlist_id: playlistData.id,
          title: track.title || 'Untitled',
          artist: track.artist || 'Unknown Artist',
          bpm: track.bpm ? Number(track.bpm) : null,
          energy: track.energy ? Number(track.energy) : null,
          duration: track.duration ? Number(track.duration) : 180,
          source_url: track.url || track.source_url || null
        })).filter((track: any) => track.title && track.artist); // Filter out invalid tracks

        if (trackData.length > 0) {
          const { error: tracksError } = await supabase
            .from('tracks')
            .insert(trackData);

          if (tracksError) {
            console.error('Supabase tracks save error:', tracksError);
            // Don't fail the whole operation for track errors
            console.warn('Failed to save some tracks, but playlist was saved');
          } else {
            console.log(`Saved ${trackData.length} tracks`);
          }
        }
      }

      // Bust cache
      cache.delete(`playlists:${userId}`);

      return { ...playlistData, tracks: tracks || [] };
    } catch (error) {
      console.error('SavePlaylist error:', error);
      throw error;
    }
  },

  async getUserPlaylists(userId: string) {
    return supabasePlaylistService.getPlaylists(userId);
  },
  async getPlaylists(userId: string) {
    const key = `playlists:${userId}`;
    const fromCache = getCached(key);
    if (fromCache) return fromCache;

    try {
      // First, get playlists
      const { data: playlists, error: playlistError } = await supabase
        .from("playlists")
        .select("id, user_id, name, created_at, updated_at")
        .eq("user_id", userId)
        .order('created_at', { ascending: false });

      if (playlistError) {
        console.error('Supabase playlist query error:', playlistError);
        throw new AppError('UPSTREAM_ERROR', 'Failed to fetch playlists', { details: { playlistError } });
      }

      if (!playlists || playlists.length === 0) {
        setCached(key, []);
        return [];
      }

      // Then, get tracks for each playlist
      const playlistIds = playlists.map(p => p.id);
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("id, playlist_id, title, artist, bpm, energy, duration")
        .in("playlist_id", playlistIds)
        .order('created_at', { ascending: true });

      if (tracksError) {
        console.error('Supabase tracks query error:', tracksError);
        // Return playlists without tracks rather than failing completely
        const playlistsWithoutTracks = playlists.map(p => ({ ...p, tracks: [] }));
        setCached(key, playlistsWithoutTracks);
        return playlistsWithoutTracks;
      }

      // Group tracks by playlist
      const tracksByPlaylist = (tracks || []).reduce((acc: any, track: any) => {
        if (!acc[track.playlist_id]) acc[track.playlist_id] = [];
        acc[track.playlist_id].push({
          id: track.id,
          title: track.title,
          artist: track.artist,
          bpm: track.bpm ?? undefined,
          energy: typeof track.energy === 'number' ? Number(track.energy) : undefined,
          duration: track.duration ?? 180,
        });
        return acc;
      }, {});

      // Combine playlists with their tracks
      const hydrated = playlists.map((playlist: any) => ({
        ...playlist,
        tracks: tracksByPlaylist[playlist.id] || []
      }));

      setCached(key, hydrated);
      return hydrated;
    } catch (error) {
      console.error('Supabase getPlaylists error:', error);
      throw new AppError('UPSTREAM_ERROR', 'Failed to fetch playlists', { details: { error } });
    }
  },

  async createPlaylist(userId: string, name: string) {
    const { data, error } = await supabase
      .from("playlists")
      .insert([{ user_id: userId, name }])
      .select()
      .single();
    if (error) throw new AppError('UPSTREAM_ERROR', 'Failed to create playlist', { details: { error } });
    // bust cache for user
    cache.delete(`playlists:${userId}`);
    return data;
  },

  async deletePlaylist(playlistId: string) {
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);
    if (error) throw new AppError('UPSTREAM_ERROR', 'Failed to delete playlist', { details: { error } });
    // best-effort cache bust: we don't know userId here, so clear all playlist caches
    for (const key of cache.keys()) if (key.startsWith('playlists:')) cache.delete(key);
    return true;
  },
};
