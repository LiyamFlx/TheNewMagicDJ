import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIdempotency } from '../utils/idempotency.js';
import apiConfig from './config.js';
import type { PlaylistDTO, Vibe, EnergyLevel } from '../shared/dto.js';
import { validateMagicSet } from '../shared/validators.js';
import { checkAndConsume } from '../utils/apiRateLimiter.js';
import { AppError, normalizeError } from '../src/utils/errors.js';

import {
  fetchWithRetry,
  rateLimiter,
  deduplicator,
  ApiLogger,
  type RequestContext
} from '../utils/apiUtils.js';
import {
  createSpotifyTokenManager,
  requestBatcher,
  type SpotifyTokenManager
} from '../utils/tokenCache.js';

// Initialize Spotify token manager
const spotifyTokenManager = createSpotifyTokenManager(
  apiConfig.SPOTIFY_CLIENT_ID,
  apiConfig.SPOTIFY_CLIENT_SECRET
);

// Get Spotify access token with caching
async function getSpotifyToken(): Promise<string> {
  try {
    return await spotifyTokenManager.getClientToken();
  } catch (error: any) {
    throw new AppError('SPOTIFY_AUTH_FAILED', `Failed to get Spotify token: ${error.message}`);
  }
}

// Search for YouTube videos
async function searchYouTube(query: string, maxResults: number = 10) {
  const apiKey = apiConfig.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new AppError('MISSING_CREDENTIALS', 'YouTube API key not configured');
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('maxResults', maxResults.toString());
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('key', apiKey);

  const response = await fetchWithRetry(searchUrl.toString(), {}, {
    retries: 3,
    timeoutMs: 15000,
    retryOn: [429, 500, 502, 503, 504]
  });

  if (!response.ok) {
    throw new AppError('YOUTUBE_SEARCH_FAILED', 'YouTube search failed');
  }

  return await response.json();
}

function normalizeVibe(v: string): Vibe {
  const s = (v || '').toLowerCase();
  if (s === 'electronic') return 'Electronic';
  if (s === 'hip-hop' || s === 'hiphop' || s === 'hip hop') return 'Hip-Hop';
  if (s === 'house') return 'House';
  if (s === 'techno') return 'Techno';
  return 'Electronic';
}

function normalizeEnergy(e: string): EnergyLevel {
  const s = (e || '').toLowerCase();
  return (['low', 'medium', 'high'].includes(s) ? (s as any) : 'medium');
}

// Generate Magic Set playlist
async function generateMagicSetPlaylist(vibe: Vibe, energyLevel: EnergyLevel, trackCount: number = 10): Promise<PlaylistDTO> {
  try {
    // Get Spotify token for music search
    const spotifyToken = await getSpotifyToken();

    // Create genre-based search queries
    const canonicalVibe = normalizeVibe(vibe);
    const canonicalEnergy = normalizeEnergy(energyLevel);
    const genreQueries = getGenreQueries(canonicalVibe, canonicalEnergy);

    const tracks = [];
    const seenTitles = new Set();

    for (const query of genreQueries) {
      try {
        // Search Spotify first for better metadata
        const spotifyResults = await searchSpotify(spotifyToken, query, 5);

        for (const track of spotifyResults) {
          if (tracks.length >= trackCount) break;

          const normalizedTitle = track.name.toLowerCase().replace(/[^\w\s]/g, '');
          if (seenTitles.has(normalizedTitle)) continue;
          seenTitles.add(normalizedTitle);

          // Find YouTube video for this track
          const youtubeQuery = `${track.name} ${track.artists[0].name}`;
          const youtubeResults = await searchYouTube(youtubeQuery, 1);

          if (youtubeResults.items && youtubeResults.items.length > 0) {
            const youtubeVideo = youtubeResults.items[0];

            tracks.push({
              id: track.id || `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: track.name,
              artist: track.artists.map((a: any) => a.name).join(', '),
              album: track.album?.name || 'Unknown Album',
              duration: Math.floor((track.duration_ms || 180000) / 1000),
              preview_url: track.preview_url,
              spotify_id: track.id,
              youtube_id: youtubeVideo.id.videoId,
              youtube_url: `https://www.youtube.com/watch?v=${youtubeVideo.id.videoId}`,
              thumbnail: youtubeVideo.snippet.thumbnails?.medium?.url || youtubeVideo.snippet.thumbnails?.default?.url,
              genre: canonicalVibe,
              energy_level: canonicalEnergy,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.warn('Failed to process query:', query, error);
        continue;
      }

      if (tracks.length >= trackCount) break;
    }

    // Fill remaining slots with fallback tracks if needed
    while (tracks.length < trackCount) {
      const fallbackTrack = generateFallbackTrack(canonicalVibe, canonicalEnergy, tracks.length);
      tracks.push(fallbackTrack);
    }

    // Calculate total duration
    const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

    return {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Magic ${canonicalVibe} Set (${canonicalEnergy.charAt(0).toUpperCase() + canonicalEnergy.slice(1)} Energy)`,
      description: `AI-generated ${canonicalVibe} playlist with ${canonicalEnergy} energy level. Perfect for your next DJ set!`,
      tracks,
      total_duration: totalDuration,
      user_id: 'api-generated',
      genre: canonicalVibe,
      energy_level: canonicalEnergy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schemaVersion: 1,
    };

  } catch (error) {
    console.error('Magic Set generation error:', error);
    throw error;
  }
}

// Search Spotify for tracks with batching optimization
async function searchSpotify(token: string, query: string, limit: number = 10) {
  const batchKey = `spotify_search:${query}:${limit}`;

  return requestBatcher.batch(batchKey, async () => {
    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', limit.toString());

    const response = await fetchWithRetry(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }, {
      retries: 3,
      timeoutMs: 15000,
      retryOn: [429, 500, 502, 503, 504]
    });

    if (!response.ok) {
      throw new AppError('SPOTIFY_SEARCH_FAILED', 'Spotify search failed');
    }

    const data = await response.json();
    return data.tracks.items;
  }, 100); // 100ms batching window
}

// Get genre-specific search queries
function getGenreQueries(vibe: string, energyLevel: string): string[] {
  const baseQueries: Record<string, string[]> = {
    'Electronic': ['electronic music', 'EDM', 'synthesizer', 'techno', 'house music'],
    'Hip-Hop': ['hip hop', 'rap music', 'urban beats', 'trap music', 'hip hop beats'],
    'House': ['house music', 'deep house', 'tech house', 'progressive house', 'dance music'],
    'Techno': ['techno music', 'industrial techno', 'minimal techno', 'acid techno', 'dark techno'],
  };

  const energyModifiers: Record<string, string[]> = {
    'low': ['chill', 'ambient', 'downtempo', 'relaxed', 'smooth'],
    'medium': ['groove', 'steady', 'rhythmic', 'balanced', 'moderate'],
    'high': ['energetic', 'upbeat', 'intense', 'powerful', 'peak time'],
  };

  const base = baseQueries[vibe] || baseQueries['Electronic'];
  const modifiers = energyModifiers[energyLevel] || energyModifiers['medium'];

  const queries = [];
  for (const baseQuery of base.slice(0, 3)) {
    for (const modifier of modifiers.slice(0, 2)) {
      queries.push(`${modifier} ${baseQuery}`);
    }
  }

  return queries;
}

// Generate fallback track when APIs fail
function generateFallbackTrack(vibe: string, energyLevel: string, index: number) {
  const fallbackTracks: Record<string, any[]> = {
    'Electronic': [
      { title: 'Synthetic Dreams', artist: 'Digital Waves' },
      { title: 'Circuit Breaker', artist: 'Neon Pulse' },
      { title: 'Electric Horizon', artist: 'Cyber Sounds' },
    ],
    'Hip-Hop': [
      { title: 'Urban Flow', artist: 'Street Beats' },
      { title: 'City Rhythms', artist: 'Metro Sound' },
      { title: 'Underground Vibes', artist: 'Block Party' },
    ],
    'House': [
      { title: 'House Foundation', artist: 'Club Masters' },
      { title: 'Dance Floor', artist: 'Beat Collective' },
      { title: 'Weekend Groove', artist: 'Party Squad' },
    ],
    'Techno': [
      { title: 'Industrial Core', artist: 'Machine Logic' },
      { title: 'Techno Pulse', artist: 'Factory Floor' },
      { title: 'Digital Underground', artist: 'Chrome Beats' },
    ],
  };

  const tracks = fallbackTracks[vibe] || fallbackTracks['Electronic'];
  const track = tracks[index % tracks.length];

  return {
    id: `fallback-${Date.now()}-${index}`,
    title: track.title,
    artist: track.artist,
    album: 'Magic DJ Generated',
    duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
    preview_url: null,
    spotify_id: null,
    youtube_id: null,
    youtube_url: null,
    thumbnail: null,
    genre: vibe,
    energy_level: energyLevel as EnergyLevel,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function magicSetHandler(req: VercelRequest, res: VercelResponse) {
  const context = ApiLogger.createContext(req);

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res
      .status(405)
      .json({ error: { code: 'BAD_REQUEST', message: 'Method not allowed' } });
  }

  ApiLogger.logRequest(context, 'Magic Set generation request received');

  try {
    // Use unified rate limiter
    const clientKey = rateLimiter.getClientKey(req, 'magic-set');
    const rateLimit = rateLimiter.check(clientKey, 10, 60_000);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', Math.ceil((rateLimit.retryAfter || 1000) / 1000).toString());
      res.setHeader('Content-Type', 'application/json');
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }

    const { vibe, energyLevel, trackCount } = validateMagicSet(req.body || {});

    const playlist = await generateMagicSetPlaylist(vibe, energyLevel, trackCount);
    // Simple response validation
    const { isPlaylistDTO } = await import('../shared/dto.js');
    if (!isPlaylistDTO(playlist)) {
      throw new AppError('INTERNAL_ERROR', 'Generated playlist response invalid', { httpStatus: 500 });
    }

    ApiLogger.logRequest(context, 'Magic Set generated successfully', {
      trackCount: playlist.tracks?.length || 0,
      vibe,
      energyLevel
    });

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(playlist);

  } catch (e: any) {
    const normalized = normalizeError(e, {
      code: 'MAGIC_SET_ERROR',
      message: 'Failed to generate magic set playlist',
    });

    ApiLogger.logError(context, normalized, { vibe: req.body?.vibe, energyLevel: req.body?.energyLevel });

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: {
        ...normalized,
        httpStatus: 500,
        retryable: true,
      },
    });
  }
}

export default (apiConfig.ENABLE_IDEMPOTENCY
  ? withIdempotency(magicSetHandler)
  : magicSetHandler);
