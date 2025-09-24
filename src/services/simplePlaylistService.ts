import { Playlist, Track } from '../types/index';
import { logger } from '../utils/logger';
import {
  magicdj,
  type PlaylistDTO,
  type Vibe,
  type EnergyLevel,
} from '../sdk/magicdj';

// =============================================================================
// SIMPLIFIED PLAYLIST SERVICE FOR RELIABLE OPERATION
// =============================================================================

/**
 * Simplified playlist service that uses our API endpoints
 * This service provides reliable playlist generation with proper fallbacks
 */
export class SimplePlaylistService {
  /**
   * Generates a Magic Set playlist with robust fallbacks
   */
  async generateMagicSetPlaylist(params: {
    vibe: Vibe | string;
    energyLevel: EnergyLevel | string;
    userId?: string;
  }): Promise<Playlist> {
    const { vibe, energyLevel, userId } = params;

    logger.info('SimplePlaylistService', 'Generating Magic Set playlist', {
      vibe,
      energyLevel,
    });

    try {
      // Try typed API endpoint first via SDK
      try {
        const dto: PlaylistDTO = await magicdj.generateMagicSet({
          vibe: (typeof vibe === 'string' ? (vibe as any) : vibe) as Vibe,
          energyLevel: (typeof energyLevel === 'string'
            ? (energyLevel as any)
            : energyLevel) as EnergyLevel,
          trackCount: 10,
        });
        const playlist = this.toPlaylist(dto, userId);

        logger.info('SimplePlaylistService', 'Magic Set generated via API', {
          trackCount: playlist.tracks?.length || 0,
        });

        return playlist;
      } catch (e) {
        throw e;
      }
    } catch (error) {
      logger.warn(
        'SimplePlaylistService',
        'API unavailable, using enhanced local generation',
        _error
      );

      // Enhanced local generation with YouTube-like tracks
      return this.generateEnhancedLocalPlaylist(
        typeof vibe === 'string' ? vibe : (vibe as any),
        typeof energyLevel === 'string' ? energyLevel : (energyLevel as any),
        userId
      );
    }
  }

  private toPlaylist(dto: PlaylistDTO, userId?: string): Playlist {
    const tracks: Track[] = (dto.tracks || []).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      preview_url: t.preview_url ?? undefined,
      spotify_id: t.spotify_id ?? undefined,
      youtube_id: t.youtube_id ?? undefined,
      youtube_url: t.youtube_url ?? (undefined as any),
      thumbnail: t.thumbnail ?? (undefined as any),
      genre: t.genre,
      bpm: t.bpm,
      energy_level: t.energy_level,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      tracks,
      total_duration: dto.total_duration,
      user_id: userId || dto.user_id,
      created_at: dto.created_at,
      updated_at: dto.updated_at,
      metadata: { schemaVersion: dto.schemaVersion },
    };
  }

  /**
   * Generates a Magic Match playlist (simplified for now)
   */
  async generateMagicMatchPlaylist(params: {
    fingerprint?: string;
    seedTrack?: Track;
    userId?: string;
  }): Promise<Playlist> {
    const { seedTrack, userId } = params;

    try {
      logger.info('SimplePlaylistService', 'Generating Magic Match playlist');

      // For now, create a demo Magic Match playlist
      // In the future, this would use audio recognition APIs
      const recognizedTrack = seedTrack || this.createMockRecognizedTrack();

      // Generate a playlist based on the recognized track
      const baseGenre = this.inferGenreFromTrack(recognizedTrack);
      const playlist = await this.generateMagicSetPlaylist({
        vibe: baseGenre,
        energyLevel: 'medium',
        userId,
      });

      // Update metadata for Magic Match
      playlist.id = `magic-match-${Date.now()}`;
      playlist.name = `Magic Match: ${recognizedTrack.title}`;
      playlist.description = `AI-curated playlist based on "${recognizedTrack.title}" by ${recognizedTrack.artist}`;

      // Add the recognized track at the beginning
      playlist.tracks.unshift(recognizedTrack);
      playlist.total_duration =
        (playlist.total_duration || 0) + (recognizedTrack.duration || 180);

      return playlist;
    } catch (error) {
      logger._error(
        'SimplePlaylistService',
        'Magic Match generation failed, using fallback',
        _error
      );

      // Return fallback playlist
      return this.createFallbackMagicMatch(userId);
    }
  }

  /**
   * Generate enhanced local playlist with realistic YouTube-style tracks
   */
  private async generateEnhancedLocalPlaylist(
    vibe: string,
    energyLevel: string,
    userId?: string
  ): Promise<Playlist> {
    logger.info('SimplePlaylistService', 'Generating enhanced local playlist', {
      vibe,
      energyLevel,
    });

    const tracks = this.generateRealisticTracks(vibe, energyLevel, 10);
    const totalDuration = tracks.reduce(
      (sum, track) => sum + (track.duration || 180),
      0
    );

    return {
      id: `enhanced-${vibe.toLowerCase()}-${Date.now()}`,
      name: `Magic ${vibe} Set (${energyLevel.charAt(0).toUpperCase() + energyLevel.slice(1)} Energy)`,
      description: `AI-generated ${vibe} playlist with ${energyLevel} energy level. Perfect for your next DJ set!`,
      tracks,
      total_duration: totalDuration,
      user_id: userId || 'local-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Create a fallback Magic Match playlist when API fails
   */
  private createFallbackMagicMatch(userId?: string): Playlist {
    const recognizedTrack = this.createMockRecognizedTrack();
    const similarTracks = this.generateFallbackTracks(
      'Electronic',
      'medium',
      7
    );
    const allTracks = [recognizedTrack, ...similarTracks];
    const totalDuration = allTracks.reduce(
      (sum, track) => sum + (track.duration || 180),
      0
    );

    return {
      id: `fallback-magicmatch-${Date.now()}`,
      name: `Magic Match: ${recognizedTrack.title}`,
      description: `Demo playlist based on "${recognizedTrack.title}". Working in offline mode.`,
      tracks: allTracks,
      total_duration: totalDuration,
      user_id: userId || 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate realistic tracks with YouTube IDs for better player integration
   */
  private generateRealisticTracks(
    vibe: string,
    energyLevel: string,
    count: number
  ): Track[] {
    const realisticTracks: Record<string, any[]> = {
      Electronic: [
        {
          title: 'Midnight City',
          artist: 'M83',
          album: "Hurry Up, We're Dreaming",
          youtube_id: 'dX3k_QDnzHE',
        },
        {
          title: 'Strobe',
          artist: 'Deadmau5',
          album: 'For Lack of a Better Name',
          youtube_id: 'tKi9Z-f6qX4',
        },
        {
          title: 'Satisfaction',
          artist: 'Benny Benassi',
          album: 'Hypnotica',
          youtube_id: 'a0fkNdPiIL4',
        },
        {
          title: 'Levels',
          artist: 'Avicii',
          album: 'True',
          youtube_id: '_ovdm2yX4MA',
        },
        {
          title: 'Titanium',
          artist: 'David Guetta ft. Sia',
          album: 'Nothing but the Beat',
          youtube_id: 'JRfuAukYTKg',
        },
        {
          title: 'One More Time',
          artist: 'Daft Punk',
          album: 'Discovery',
          youtube_id: 'FGBhQbmPwH8',
        },
        {
          title: 'Animals',
          artist: 'Martin Garrix',
          album: 'Gold Skies',
          youtube_id: 'gCYcHz2k5x0',
        },
        {
          title: 'Clarity',
          artist: 'Zedd ft. Foxes',
          album: 'Clarity',
          youtube_id: 'IxxstCcJlsc',
        },
        {
          title: 'Language',
          artist: 'Porter Robinson',
          album: 'Spitfire',
          youtube_id: 'Vsy1URDYK88',
        },
        {
          title: 'Lean On',
          artist: 'Major Lazer & DJ Snake',
          album: 'Peace Is The Mission',
          youtube_id: 'YqeW9_5kURI',
        },
      ],
      'Hip-Hop': [
        {
          title: 'HUMBLE.',
          artist: 'Kendrick Lamar',
          album: 'DAMN.',
          youtube_id: 'tvTRZJ-4EyI',
        },
        {
          title: "God's Plan",
          artist: 'Drake',
          album: 'Scorpion',
          youtube_id: 'xpVfcZ0ZcFM',
        },
        {
          title: 'Sicko Mode',
          artist: 'Travis Scott',
          album: 'ASTROWORLD',
          youtube_id: '6ONRf7h3Mdk',
        },
        {
          title: 'Old Town Road',
          artist: 'Lil Nas X',
          album: '7 EP',
          youtube_id: 'r7qovpFAGrQ',
        },
        {
          title: 'Rockstar',
          artist: 'Post Malone ft. 21 Savage',
          album: 'beerbongs & bentleys',
          youtube_id: 'UceaB4D0jpo',
        },
        {
          title: 'Money Trees',
          artist: 'Kendrick Lamar',
          album: 'good kid, m.A.A.d city',
          youtube_id: 'HuWP6Hr52EY',
        },
        {
          title: 'INDUSTRY BABY',
          artist: 'Lil Nas X & Jack Harlow',
          album: 'MONTERO',
          youtube_id: '5XeY9mKQqyI',
        },
        {
          title: 'The Box',
          artist: 'Roddy Ricch',
          album: 'Please Excuse Me for Being Antisocial',
          youtube_id: 'uLHqpjW3aDs',
        },
      ],
      House: [
        {
          title: 'One More Time',
          artist: 'Daft Punk',
          album: 'Discovery',
          youtube_id: 'FGBhQbmPwH8',
        },
        {
          title: 'Show Me Love',
          artist: 'Robin S.',
          album: 'Show Me Love',
          youtube_id: 'Ps2Jc28tQrw',
        },
        {
          title: 'Finally',
          artist: 'CeCe Peniston',
          album: 'Finally',
          youtube_id: 'xk8mm1Qmt-Y',
        },
        {
          title: 'Your Love',
          artist: 'Frankie Knuckles',
          album: 'Beyond the Mix',
          youtube_id: 'LOLE1YE_oFQ',
        },
        {
          title: 'Good Life',
          artist: 'Inner City',
          album: 'Paradise',
          youtube_id: 'KQwu4wff7lI',
        },
        {
          title: 'Around the World',
          artist: 'Daft Punk',
          album: 'Homework',
          youtube_id: 'dwDns8x3Jb4',
        },
        {
          title: 'Strings of Life',
          artist: 'Derrick May',
          album: 'Innovator',
          youtube_id: '3vQB4hEqGrg',
        },
        {
          title: 'Can You Feel It',
          artist: 'Mr. Fingers',
          album: 'Amnesia',
          youtube_id: 'V5wYhh6MgfM',
        },
      ],
      Techno: [
        {
          title: 'Spastik',
          artist: 'Plastikman',
          album: 'Musik',
          youtube_id: 'YQQ2StSwg90',
        },
        {
          title: 'Age of Love',
          artist: 'Age of Love',
          album: 'The Age of Love',
          youtube_id: 'CJzK6tCt0y8',
        },
        {
          title: 'Strings of Life',
          artist: 'Derrick May',
          album: 'Innovator',
          youtube_id: '3vQB4hEqGrg',
        },
        {
          title: 'No UFOs',
          artist: 'Model 500',
          album: 'Deep Space',
          youtube_id: 'TXNKm8zxBRQ',
        },
        {
          title: 'Energy Flash',
          artist: 'Joey Beltram',
          album: 'Energy Flash',
          youtube_id: 'M8sXjH8FVd4',
        },
        {
          title: 'Acid Tracks',
          artist: 'Phuture',
          album: 'Acid Tracks',
          youtube_id: 'igNVdlXhKcI',
        },
        {
          title: 'Born Slippy',
          artist: 'Underworld',
          album: 'Born Slippy',
          youtube_id: 'iTFrCbQGyvM',
        },
        {
          title: 'Cafe Del Mar',
          artist: 'Energy 52',
          album: 'Cafe Del Mar',
          youtube_id: 'ihqPlJpbZd0',
        },
      ],
    };

    const tracks = realisticTracks[vibe] || realisticTracks['Electronic'];
    const results: Track[] = [];

    // Energy level affects BPM and selection
    const bpmRange = {
      low: { min: 90, max: 110 },
      medium: { min: 110, max: 130 },
      high: { min: 130, max: 150 },
    }[energyLevel] || { min: 110, max: 130 };

    for (let i = 0; i < Math.min(count, tracks.length); i++) {
      const track = tracks[i];
      const bpm =
        Math.floor(Math.random() * (bpmRange.max - bpmRange.min + 1)) +
        bpmRange.min;
      const duration = 180 + Math.floor(Math.random() * 120); // 3-5 minutes

      results.push({
        id: track.youtube_id, // Use YouTube ID as track ID for audioSourceService compatibility
        title: track.title,
        artist: track.artist,
        album: 'YouTube', // Set album to 'YouTube' for audioSourceService compatibility
        duration,
        preview_url: undefined,
        spotify_id: undefined,
        youtube_id: track.youtube_id,
        youtube_url: `https://www.youtube.com/watch?v=${track.youtube_id}`,
        thumbnail: `https://img.youtube.com/vi/${track.youtube_id}/maxresdefault.jpg`,
        genre: vibe,
        bpm,
        energy_level: energyLevel,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * Generate demo tracks for fallback playlists
   */
  private generateFallbackTracks(
    vibe: string,
    energyLevel: string,
    count: number
  ): Track[] {
    const trackTemplates: Record<string, any[]> = {
      Electronic: [
        {
          title: 'Synthetic Dreams',
          artist: 'Digital Waves',
          album: 'Cyber Collection',
        },
        {
          title: 'Neon Pulse',
          artist: 'Electric Mind',
          album: 'Future Sounds',
        },
        {
          title: 'Circuit Breaker',
          artist: 'Tech Vision',
          album: 'Electronic Beats',
        },
        { title: 'Data Stream', artist: 'Binary Code', album: 'Digital Age' },
        { title: 'Voltage Drop', artist: 'Power Grid', album: 'Energy Flow' },
        { title: 'Silicon Valley', artist: 'Code Runner', album: 'Tech House' },
        {
          title: 'Neural Network',
          artist: 'AI Collective',
          album: 'Machine Learning',
        },
        { title: 'Quantum Leap', artist: 'Future Bass', album: 'Next Level' },
      ],
      'Hip-Hop': [
        { title: 'Street Wisdom', artist: 'Urban Flow', album: 'City Beats' },
        {
          title: 'Block Party',
          artist: 'Corner Collective',
          album: 'Hood Classics',
        },
        { title: 'Mic Check', artist: 'Lyric Master', album: 'Verbal Skills' },
        { title: 'Bass Line', artist: 'Beat Maker', album: 'Rhythm Section' },
        { title: 'Flow State', artist: 'Rhyme Time', album: 'Word Play' },
        {
          title: 'Urban Legend',
          artist: 'City Stories',
          album: 'Street Tales',
        },
        { title: 'Boom Bap', artist: 'Classic Hip-Hop', album: 'Old School' },
        { title: 'Freestyle', artist: 'Improv Master', album: 'Off The Dome' },
      ],
      House: [
        {
          title: 'House Foundation',
          artist: 'Club Masters',
          album: 'Dance Floor',
        },
        {
          title: 'Four on Floor',
          artist: 'Beat Collective',
          album: 'Rhythm House',
        },
        {
          title: 'Deep Groove',
          artist: 'Underground Sound',
          album: 'Basement Tracks',
        },
        { title: 'Weekend Vibe', artist: 'Party Squad', album: 'Club Night' },
        { title: 'Dance Fever', artist: 'Floor Fillers', album: 'Peak Time' },
        {
          title: 'House Rules',
          artist: 'DJ Alliance',
          album: 'Club Standards',
        },
        {
          title: 'Groove Machine',
          artist: 'Beat Factory',
          album: 'Dance Music',
        },
        { title: 'Club Anthem', artist: 'Dance Floor', album: 'Party Time' },
      ],
      Techno: [
        {
          title: 'Industrial Core',
          artist: 'Machine Logic',
          album: 'Factory Floor',
        },
        {
          title: 'Dark Matter',
          artist: 'Void Collective',
          album: 'Black Hole',
        },
        {
          title: 'Steel Pulse',
          artist: 'Metal Beats',
          album: 'Industrial Sound',
        },
        { title: 'Underground', artist: 'Tunnel Vision', album: 'Deep Techno' },
        {
          title: 'Acid Test',
          artist: 'Chemical Reaction',
          album: 'Lab Experiments',
        },
        {
          title: 'Robot Dance',
          artist: 'Mechanical Movement',
          album: 'Automation',
        },
        {
          title: 'Binary Beat',
          artist: 'Digital Factory',
          album: 'System Sounds',
        },
        { title: 'Chrome Hearts', artist: 'Cyber Punk', album: 'Future Shock' },
      ],
    };

    const templates = trackTemplates[vibe] || trackTemplates['Electronic'];
    const tracks: Track[] = [];

    // Energy level affects BPM and track selection
    const bpmRange = {
      low: { min: 90, max: 110 },
      medium: { min: 110, max: 130 },
      high: { min: 130, max: 150 },
    }[energyLevel] || { min: 110, max: 130 };

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const bpm =
        Math.floor(Math.random() * (bpmRange.max - bpmRange.min + 1)) +
        bpmRange.min;
      const duration = 180 + Math.floor(Math.random() * 120); // 3-5 minutes

      tracks.push({
        id: `demo-${vibe.toLowerCase()}-${i}-${Date.now()}`,
        title: template.title,
        artist: template.artist,
        album: template.album,
        duration,
        preview_url: undefined,
        spotify_id: undefined,
        youtube_id: undefined,
        youtube_url: undefined,
        genre: vibe,
        bpm,
        energy_level: energyLevel,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return tracks;
  }

  /**
   * Create a mock recognized track for Magic Match demo
   */
  private createMockRecognizedTrack(): Track {
    const mockTracks = [
      {
        title: 'Electric Horizon',
        artist: 'Neon Dreams',
        album: 'Future Beats',
      },
      { title: 'Digital Soul', artist: 'Cyber Wave', album: 'Electronic Mind' },
      {
        title: 'Synthetic Love',
        artist: 'Tech Heart',
        album: 'Emotional Circuits',
      },
      {
        title: 'Code Breaker',
        artist: 'Hacker Collective',
        album: 'System Override',
      },
    ];

    const template = mockTracks[Math.floor(Math.random() * mockTracks.length)];

    return {
      id: `recognized-${Date.now()}`,
      title: template.title,
      artist: template.artist,
      album: template.album,
      duration: 210,
      preview_url: undefined,
      spotify_id: undefined,
      youtube_id: undefined,
      youtube_url: undefined,
      genre: 'Electronic',
      bpm: 125,
      energy_level: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Infer genre from a track (simple heuristic)
   */
  private inferGenreFromTrack(track: Track): string {
    const title = track.title.toLowerCase();
    const artist = track.artist.toLowerCase();

    if (title.includes('house') || artist.includes('house')) return 'House';
    if (title.includes('techno') || artist.includes('techno')) return 'Techno';
    if (
      title.includes('hip') ||
      title.includes('rap') ||
      artist.includes('hip')
    )
      return 'Hip-Hop';

    return 'Electronic'; // Default
  }
}

// Export singleton instance
export const simplePlaylistService = new SimplePlaylistService();
