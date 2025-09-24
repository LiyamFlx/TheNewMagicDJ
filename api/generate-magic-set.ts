import type { VercelRequest, VercelResponse } from '@vercel/node';

// Get API key from environment
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

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
      'Accept': 'application/json'
    }
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
    'Electronic': ['electronic music', 'techno', 'house music', 'EDM', 'synthesizer music'],
    'Hip-Hop': ['hip hop music', 'rap beats', 'trap music', 'hip hop instrumental'],
    'House': ['house music', 'deep house', 'tech house', 'progressive house'],
    'Techno': ['techno music', 'minimal techno', 'acid techno', 'industrial techno']
  };

  const energyModifiers: Record<string, string[]> = {
    'low': ['chill', 'ambient', 'downtempo', 'relaxed'],
    'medium': ['groove', 'steady', 'rhythmic'],
    'high': ['energetic', 'upbeat', 'intense', 'peak time']
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
    const { vibe = 'Electronic', energyLevel = 'medium', trackCount = 10 } = req.body || {};

    console.log(`[Magic Set] Generating ${trackCount} tracks for ${vibe} with ${energyLevel} energy`);

    const tracks = [];
    const searchQueries = getSearchQueries(vibe, energyLevel);
    let sourceCount = 0;
    const sourceTypes: string[] = [];

    // Generate tracks with real YouTube sources
    for (let i = 0; i < trackCount && i < searchQueries.length; i++) {
      try {
        const query = searchQueries[i];
        console.log(`[Magic Set] Searching YouTube for: "${query}"`);

        const youtubeResults = await searchYouTube(query, 1);

        if (youtubeResults && youtubeResults.length > 0) {
          const video = youtubeResults[0];
          const videoId = video.id?.videoId;

          if (videoId) {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

            tracks.push({
              id: `track-${Date.now()}-${i}`,
              title: video.snippet?.title || `${vibe} Track ${i + 1}`,
              artist: video.snippet?.channelTitle || 'Unknown Artist',
              album: 'Magic DJ Generated',
              duration: 180 + Math.floor(Math.random() * 120),
              bpm: 120 + Math.floor(Math.random() * 20),
              energy: energyLevel === 'low' ? 40 + Math.random() * 20 : energyLevel === 'high' ? 80 + Math.random() * 20 : 60 + Math.random() * 20,
              key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
              genre: vibe,
              // REAL AUDIO SOURCES
              youtube_id: videoId,
              youtube_url: youtubeUrl,
              source_url: youtubeUrl,
              thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            sourceCount++;
            if (!sourceTypes.includes('youtube')) {
              sourceTypes.push('youtube');
            }

            console.log(`[Magic Set] ✅ Resolved audio source: trackId="${tracks[tracks.length-1].id}", sourceCount=1, sourceTypes=["youtube"], url="${youtubeUrl}"`);
          }
        }
      } catch (error) {
        console.error(`[Magic Set] Failed to resolve source for query "${searchQueries[i]}":`, error);
        // Add fallback track without source
        tracks.push({
          id: `track-${Date.now()}-${i}`,
          title: `${vibe} Track ${i + 1}`,
          artist: 'AI Generator',
          album: 'Magic DJ Generated',
          duration: 180 + Math.floor(Math.random() * 120),
          bpm: 120 + Math.floor(Math.random() * 20),
          energy: energyLevel === 'low' ? 40 + Math.random() * 20 : energyLevel === 'high' ? 80 + Math.random() * 20 : 60 + Math.random() * 20,
          key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
          genre: vibe,
          // NO AUDIO SOURCES - placeholder
          youtube_id: null,
          youtube_url: null,
          source_url: null,
          thumbnail: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        console.log(`[Magic Set] ❌ Failed to resolve audio source: trackId="${tracks[tracks.length-1].id}", sourceCount=0, sourceTypes=[]`);
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
              title: video.snippet?.title || `${vibe} Track ${tracks.length + 1}`,
              artist: video.snippet?.channelTitle || 'Unknown Artist',
              album: 'Magic DJ Generated',
              duration: 180 + Math.floor(Math.random() * 120),
              bpm: 120 + Math.floor(Math.random() * 20),
              energy: energyLevel === 'low' ? 40 + Math.random() * 20 : energyLevel === 'high' ? 80 + Math.random() * 20 : 60 + Math.random() * 20,
              key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
              genre: vibe,
              youtube_id: videoId,
              youtube_url: youtubeUrl,
              source_url: youtubeUrl,
              thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            sourceCount++;
            console.log(`[Magic Set] ✅ Additional source resolved: trackId="${tracks[tracks.length-1].id}", sourceCount=1, sourceTypes=["youtube"], url="${youtubeUrl}"`);
          }
        } else {
          break; // No more results available
        }
      } catch (error) {
        console.error(`[Magic Set] Additional search failed:`, error);
        break;
      }
    }

    console.log(`[Magic Set] Generation complete: ${tracks.length} tracks, ${sourceCount} with sources`);

    const playlist = {
      id: `playlist-${Date.now()}`,
      name: `Magic ${vibe} Set (${energyLevel} energy)`,
      description: `AI-generated ${vibe} playlist with ${energyLevel} energy level. ${sourceCount}/${tracks.length} tracks have playable sources.`,
      tracks: tracks,
      total_duration: tracks.reduce((sum, track) => sum + track.duration, 0),
      user_id: 'api-generated',
      genre: vibe,
      energy_level: energyLevel,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // AUDIO SOURCE METADATA
      source_metadata: {
        total_tracks: tracks.length,
        sourced_tracks: sourceCount,
        source_types: sourceTypes,
        source_coverage: Math.round((sourceCount / tracks.length) * 100)
      }
    };

    console.log(`[Magic Set] Final result: totalTracks=${playlist.source_metadata.total_tracks}, sourcedTracks=${playlist.source_metadata.sourced_tracks}, sourceTypes=${JSON.stringify(playlist.source_metadata.source_types)}, coverage=${playlist.source_metadata.source_coverage}%`);

    res.status(200).json(playlist);
  } catch (error) {
    console.error('[Magic Set] Generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate magic set',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}