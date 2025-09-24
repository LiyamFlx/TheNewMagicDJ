import type { VercelRequest, VercelResponse } from '@vercel/node';

// Get API keys from environment
const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
const SPOTIFY_CLIENT_ID =
  process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET =
  process.env.SPOTIFY_CLIENT_SECRET || process.env.VITE_SPOTIFY_CLIENT_SECRET;

// Get Spotify access token
async function getSpotifyToken(): Promise<string> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials not configured');
  }

  const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Search Spotify for tracks with preview URLs
async function searchSpotify(
  query: string,
  token: string,
  maxResults: number = 1
) {
  const searchUrl = new URL('https://api.spotify.com/v1/search');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'track');
  searchUrl.searchParams.set('limit', maxResults.toString());

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.tracks?.items || [];
}

// Search YouTube for real tracks
async function searchYouTube(query: string, maxResults: number = 1) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('maxResults', maxResults.toString());
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

// Generate search queries based on vibe and energy
function getSearchQueries(vibe: string, energyLevel: string) {
  const genreMap: Record<string, string[]> = {
    Electronic: [
      'electronic music',
      'techno',
      'house music',
      'EDM',
      'synthesizer music',
    ],
    'Hip-Hop': [
      'hip hop music',
      'rap beats',
      'trap music',
      'hip hop instrumental',
    ],
    House: ['house music', 'deep house', 'tech house', 'progressive house'],
    Techno: [
      'techno music',
      'minimal techno',
      'acid techno',
      'industrial techno',
    ],
  };

  const energyModifiers: Record<string, string[]> = {
    low: ['chill', 'ambient', 'downtempo', 'relaxed'],
    medium: ['groove', 'steady', 'rhythmic'],
    high: ['energetic', 'upbeat', 'intense', 'peak time'],
  };

  const baseQueries = genreMap[vibe] || genreMap['Electronic'];
  const modifiers = energyModifiers[energyLevel] || energyModifiers['medium'];

  const queries = [];
  for (const base of baseQueries.slice(0, 3)) {
    for (const modifier of modifiers.slice(0, 2)) {
      queries.push(`${modifier} ${base}`);
    }
  }

  return queries;
}

// Real magic set generation with actual YouTube sources
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      vibe = 'Electronic',
      energyLevel = 'medium',
      trackCount = 10,
    } = req.body || {};

    console.log(
      `[Magic Set] Generating ${trackCount} tracks for ${vibe} with ${energyLevel} energy`
    );

    const tracks = [];
    const searchQueries = getSearchQueries(vibe, energyLevel);
    let totalSourceCount = 0;
    const allSourceTypes = new Set<string>();

    // Get Spotify access token for multi-provider resolution
    let spotifyToken: string | null = null;
    try {
      spotifyToken = await getSpotifyToken();
      console.log(`[Magic Set] ✅ Spotify API authenticated`);
    } catch (error) {
      console.warn(
        `[Magic Set] ⚠️ Spotify authentication failed, using YouTube only:`,
        error
      );
    }

    // Generate tracks with multi-provider sources (Spotify + YouTube)
    for (let i = 0; i < trackCount && i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`[Magic Set] Multi-provider search for: "${query}"`);

      let trackSourceCount = 0;
      const trackSourceTypes: string[] = [];
      let trackData: any = {
        id: `track-${Date.now()}-${i}`,
        title: `${vibe} Track ${i + 1}`,
        artist: 'Unknown Artist',
        album: 'Magic DJ Generated',
        duration: 180 + Math.floor(Math.random() * 120),
        bpm: 120 + Math.floor(Math.random() * 20),
        energy:
          energyLevel === 'low'
            ? 40 + Math.random() * 20
            : energyLevel === 'high'
              ? 80 + Math.random() * 20
              : 60 + Math.random() * 20,
        key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
        genre: vibe,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Initialize source fields
        youtube_id: null,
        youtube_url: null,
        spotify_id: null,
        preview_url: null,
        source_url: null,
        thumbnail: null,
      };

      // Try Spotify first for better metadata and preview URLs
      if (spotifyToken) {
        try {
          console.log(`[Magic Set] Searching Spotify for: "${query}"`);
          const spotifyResults = await searchSpotify(query, spotifyToken, 1);

          if (spotifyResults && spotifyResults.length > 0) {
            const track = spotifyResults[0];
            trackData.title = track.name || trackData.title;
            trackData.artist = track.artists?.[0]?.name || trackData.artist;
            trackData.album = track.album?.name || trackData.album;
            trackData.duration = Math.floor(
              (track.duration_ms || 180000) / 1000
            );
            trackData.spotify_id = track.id;
            trackData.thumbnail =
              track.album?.images?.[1]?.url || track.album?.images?.[0]?.url;

            // Add Spotify preview URL if available
            if (track.preview_url) {
              trackData.preview_url = track.preview_url;
              trackData.source_url = track.preview_url; // Primary source
              trackSourceCount++;
              trackSourceTypes.push('spotify');
              allSourceTypes.add('spotify');
              console.log(
                `[Magic Set] ✅ Spotify preview resolved: trackId="${trackData.id}", preview_url="${track.preview_url}"`
              );
            }
          }
        } catch (error) {
          console.warn(
            `[Magic Set] Spotify search failed for "${query}":`,
            error
          );
        }
      }

      // Try YouTube as secondary/fallback source
      try {
        console.log(
          `[Magic Set] Searching YouTube for: "${trackData.title} ${trackData.artist}"`
        );
        const youtubeQuery = `${trackData.title} ${trackData.artist}`;
        const youtubeResults = await searchYouTube(youtubeQuery, 1);

        if (youtubeResults && youtubeResults.length > 0) {
          const video = youtubeResults[0];
          const videoId = video.id?.videoId;

          if (videoId) {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            trackData.youtube_id = videoId;
            trackData.youtube_url = youtubeUrl;

            // Use YouTube as primary source if no Spotify preview
            if (!trackData.source_url) {
              trackData.source_url = youtubeUrl;
            }

            trackSourceCount++;
            trackSourceTypes.push('youtube');
            allSourceTypes.add('youtube');
            console.log(
              `[Magic Set] ✅ YouTube resolved: trackId="${trackData.id}", youtube_url="${youtubeUrl}"`
            );
          }
        }
      } catch (error) {
        console.warn(
          `[Magic Set] YouTube search failed for "${trackData.title}":`,
          error
        );
      }

      // Add track regardless of source resolution (with clear logging)
      tracks.push(trackData);
      totalSourceCount += trackSourceCount;

      if (trackSourceCount > 0) {
        console.log(
          `[Magic Set] ✅ Multi-provider resolution: trackId="${trackData.id}", sourceCount=${trackSourceCount}, sourceTypes=${JSON.stringify(trackSourceTypes)}`
        );
      } else {
        console.log(
          `[Magic Set] ❌ No sources resolved: trackId="${trackData.id}", sourceCount=0, sourceTypes=[]`
        );
      }
    }

    // Fill remaining slots with more searches if needed
    while (tracks.length < trackCount) {
      const query = `${vibe} music ${energyLevel} energy`;
      try {
        console.log(`[Magic Set] Additional search for: "${query}"`);
        const youtubeResults = await searchYouTube(query, 1);

        if (youtubeResults && youtubeResults.length > 0) {
          const video = youtubeResults[0];
          const videoId = video.id?.videoId;

          if (videoId) {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            tracks.push({
              id: `track-${Date.now()}-${tracks.length}`,
              title:
                video.snippet?.title || `${vibe} Track ${tracks.length + 1}`,
              artist: video.snippet?.channelTitle || 'Unknown Artist',
              album: 'Magic DJ Generated',
              duration: 180 + Math.floor(Math.random() * 120),
              bpm: 120 + Math.floor(Math.random() * 20),
              energy:
                energyLevel === 'low'
                  ? 40 + Math.random() * 20
                  : energyLevel === 'high'
                    ? 80 + Math.random() * 20
                    : 60 + Math.random() * 20,
              key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][
                Math.floor(Math.random() * 7)
              ],
              genre: vibe,
              youtube_id: videoId,
              youtube_url: youtubeUrl,
              source_url: youtubeUrl,
              thumbnail:
                video.snippet?.thumbnails?.medium?.url ||
                video.snippet?.thumbnails?.default?.url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            totalSourceCount++;
            console.log(
              `[Magic Set] ✅ Additional source resolved: trackId="${tracks[tracks.length - 1].id}", sourceCount=1, sourceTypes=["youtube"], url="${youtubeUrl}"`
            );
          }
        } else {
          break; // No more results available
        }
      } catch (error) {
        console.error(`[Magic Set] Additional search failed:`, error);
        break;
      }
    }

    // Calculate final statistics
    const tracksWithSources = tracks.filter(track => track.source_url).length;
    const sourceTypesArray = Array.from(allSourceTypes);

    console.log(
      `[Magic Set] Generation complete: ${tracks.length} tracks, ${tracksWithSources} with sources, ${totalSourceCount} total sources`
    );

    const playlist = {
      id: `playlist-${Date.now()}`,
      name: `Magic ${vibe} Set (${energyLevel} energy)`,
      description: `AI-generated ${vibe} playlist with ${energyLevel} energy level. Multi-provider sources: ${sourceTypesArray.join(', ')}. ${tracksWithSources}/${tracks.length} tracks playable.`,
      tracks: tracks,
      total_duration: tracks.reduce((sum, track) => sum + track.duration, 0),
      user_id: 'api-generated',
      genre: vibe,
      energy_level: energyLevel,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // MULTI-PROVIDER AUDIO SOURCE METADATA
      source_metadata: {
        total_tracks: tracks.length,
        sourced_tracks: tracksWithSources,
        total_sources: totalSourceCount,
        source_types: sourceTypesArray,
        source_coverage: Math.round((tracksWithSources / tracks.length) * 100),
        multi_provider: sourceTypesArray.length > 1,
        providers_available: sourceTypesArray.length,
      },
    };

    console.log(
      `[Magic Set] MULTI-PROVIDER RESULT: totalTracks=${playlist.source_metadata.total_tracks}, sourcedTracks=${playlist.source_metadata.sourced_tracks}, totalSources=${playlist.source_metadata.total_sources}, sourceTypes=${JSON.stringify(playlist.source_metadata.source_types)}, multiProvider=${playlist.source_metadata.multi_provider}, coverage=${playlist.source_metadata.source_coverage}%`
    );

    res.status(200).json(playlist);
  } catch (error) {
    console.error('[Magic Set] Generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate magic set',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
