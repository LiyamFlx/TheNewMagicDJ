// =============================================================================
// REQUEST VALIDATION UTILITIES
// =============================================================================
// Centralized validation for API requests with proper error handling

import type {
  EnergyLevel,
  Vibe,
  MagicSetRequest,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackRequest,
  CreateSessionRequest,
  UpdateSessionRequest
} from './dto.js';
import {
  isValidVibe,
  isValidEnergyLevel,
  isMagicSetRequest
} from './dto.js';

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export class ValidationError extends Error {
  public readonly status = 400;
  public readonly errors: string[];

  constructor(errors: string | string[]) {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    super(errorArray.join(', '));
    this.name = 'ValidationError';
    this.errors = errorArray;
  }
}

// =============================================================================
// REQUEST VALIDATORS
// =============================================================================

export type YouTubeSearchRequest = { q: string; maxResults?: number };

/**
 * Validate magic set generation request
 */
export function validateMagicSet(body: any): { vibe: Vibe; energyLevel: EnergyLevel; trackCount: number } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  // Use the improved validation from dto.ts
  if (!isMagicSetRequest(body)) {
    // Provide detailed error messages
    const vibe = String(body?.vibe ?? '').trim();
    const energy = String(body?.energyLevel ?? '').trim();
    const trackCountRaw = body?.trackCount;

    if (!vibe || !isValidVibe(vibe)) {
      errors.push('Invalid vibe. Must be one of: Electronic, Hip-Hop, House, Techno');
    }

    if (!energy || !isValidEnergyLevel(energy)) {
      errors.push('Invalid energyLevel. Must be one of: low, medium, high');
    }

    if (trackCountRaw !== undefined) {
      const n = Number(trackCountRaw);
      if (!Number.isFinite(n) || n < 1 || n > 50) {
        errors.push('trackCount must be a number between 1 and 50');
      }
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }
  }

  // Normalize and constrain values
  const trackCount = body.trackCount !== undefined
    ? Math.min(Math.max(Math.floor(Number(body.trackCount)), 1), 50)
    : 10;

  return {
    vibe: body.vibe as Vibe,
    energyLevel: body.energyLevel as EnergyLevel,
    trackCount
  };
}

/**
 * Validate YouTube search request
 */
export function validateYouTubeSearch(query: any): { q: string; maxResults: number } {
  const q = String(query?.q ?? '').trim();
  const mr = query?.maxResults !== undefined ? Number(query?.maxResults) : 10;

  if (!q) {
    throw new ValidationError('Missing query parameter');
  }

  if (q.length > 500) {
    throw new ValidationError('Query too long (max 500 characters)');
  }

  const maxResults = Math.max(1, Math.min(50, Number.isFinite(mr) ? Math.floor(mr) : 10));
  return { q, maxResults };
}

/**
 * Validate create playlist request
 */
export function validateCreatePlaylist(body: any): CreatePlaylistRequest {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const name = String(body?.name ?? '').trim();
  if (!name) {
    errors.push('Playlist name is required');
  } else if (name.length > 255) {
    errors.push('Playlist name too long (max 255 characters)');
  }

  const description = body?.description ? String(body.description).trim() : undefined;
  if (description && description.length > 1000) {
    errors.push('Description too long (max 1000 characters)');
  }

  const genre = body?.genre;
  if (genre && !isValidVibe(genre)) {
    errors.push('Invalid genre. Must be one of: Electronic, Hip-Hop, House, Techno');
  }

  const energy_level = body?.energy_level;
  if (energy_level && !isValidEnergyLevel(energy_level)) {
    errors.push('Invalid energy_level. Must be one of: low, medium, high');
  }

  if (errors.length) {
    throw new ValidationError(errors);
  }

  return {
    name,
    description: description || undefined,
    genre: genre || undefined,
    energy_level: energy_level || undefined,
  };
}

/**
 * Validate update playlist request
 */
export function validateUpdatePlaylist(body: any): UpdatePlaylistRequest {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const name = body?.name ? String(body.name).trim() : undefined;
  if (name !== undefined) {
    if (!name) {
      errors.push('Playlist name cannot be empty');
    } else if (name.length > 255) {
      errors.push('Playlist name too long (max 255 characters)');
    }
  }

  const description = body?.description ? String(body.description).trim() : undefined;
  if (description && description.length > 1000) {
    errors.push('Description too long (max 1000 characters)');
  }

  const genre = body?.genre;
  if (genre && !isValidVibe(genre)) {
    errors.push('Invalid genre. Must be one of: Electronic, Hip-Hop, House, Techno');
  }

  const energy_level = body?.energy_level;
  if (energy_level && !isValidEnergyLevel(energy_level)) {
    errors.push('Invalid energy_level. Must be one of: low, medium, high');
  }

  if (errors.length) {
    throw new ValidationError(errors);
  }

  return {
    name,
    description,
    genre,
    energy_level,
  };
}

/**
 * Validate add track request
 */
export function validateAddTrack(body: any): AddTrackRequest {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const title = String(body?.title ?? '').trim();
  if (!title) {
    errors.push('Track title is required');
  } else if (title.length > 500) {
    errors.push('Track title too long (max 500 characters)');
  }

  const artist = String(body?.artist ?? '').trim();
  if (!artist) {
    errors.push('Artist name is required');
  } else if (artist.length > 500) {
    errors.push('Artist name too long (max 500 characters)');
  }

  // Optional fields validation
  const duration = body?.duration;
  if (duration !== undefined) {
    const d = Number(duration);
    if (!Number.isFinite(d) || d < 0 || d > 3600) {
      errors.push('Duration must be between 0 and 3600 seconds');
    }
  }

  const bpm = body?.bpm;
  if (bpm !== undefined) {
    const b = Number(bpm);
    if (!Number.isFinite(b) || b < 60 || b > 200) {
      errors.push('BPM must be between 60 and 200');
    }
  }

  const energy = body?.energy;
  if (energy !== undefined) {
    const e = Number(energy);
    if (!Number.isFinite(e) || e < 0 || e > 100) {
      errors.push('Energy must be between 0 and 100');
    }
  }

  const energy_level = body?.energy_level;
  if (energy_level && !isValidEnergyLevel(energy_level)) {
    errors.push('Invalid energy_level. Must be one of: low, medium, high');
  }

  if (errors.length) {
    throw new ValidationError(errors);
  }

  return {
    title,
    artist,
    album: body?.album ? String(body.album).trim() : undefined,
    duration: duration ? Number(duration) : undefined,
    bpm: bpm ? Number(bpm) : undefined,
    energy: energy ? Number(energy) : undefined,
    key: body?.key ? String(body.key).trim() : undefined,
    genre: body?.genre ? String(body.genre).trim() : undefined,
    energy_level: energy_level || undefined,
    position: body?.position ? Number(body.position) : undefined,
    spotify_id: body?.spotify_id ? String(body.spotify_id).trim() : undefined,
    youtube_id: body?.youtube_id ? String(body.youtube_id).trim() : undefined,
    youtube_url: body?.youtube_url ? String(body.youtube_url).trim() : undefined,
    preview_url: body?.preview_url ? String(body.preview_url).trim() : undefined,
    thumbnail: body?.thumbnail ? String(body.thumbnail).trim() : undefined,
  };
}


