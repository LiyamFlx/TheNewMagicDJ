import { AppError } from '../utils/errors';
import type { PlaylistDTO, Vibe, EnergyLevel } from '../../shared/dto';

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError('UPSTREAM_ERROR', `Request failed: ${res.status}`, { httpStatus: res.status, details: { body: text } });
  }
  return res.json() as Promise<T>;
}

export const magicdj = {
  async generateMagicSet(params: { vibe: Vibe; energyLevel: EnergyLevel; trackCount?: number }): Promise<PlaylistDTO> {
    const body = JSON.stringify({ ...params, trackCount: Math.min(params.trackCount ?? 10, 20) });
    return fetchJSON<PlaylistDTO>('/api/generate-magic-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  },

  async getSpotifyToken(): Promise<{ access_token: string; token_type: string; expires_in: number; }>{
    return fetchJSON('/api/spotify-token');
  },
};

export type { PlaylistDTO, Vibe, EnergyLevel };
