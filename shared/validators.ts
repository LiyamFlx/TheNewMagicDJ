import type { EnergyLevel, Vibe } from './dto';

export type MagicSetRequest = { vibe: string; energyLevel: string; trackCount?: number };
export type YouTubeSearchRequest = { q: string; maxResults?: number };

export function validateMagicSet(body: any): { vibe: Vibe; energyLevel: EnergyLevel; trackCount: number } {
  const errors: string[] = [];
  const vibe = String(body?.vibe ?? '').trim();
  const energy = String(body?.energyLevel ?? '').trim();
  const trackCountRaw = body?.trackCount;

  const v = vibe.toLowerCase();
  const e = energy.toLowerCase();

  const vMap: Record<string, Vibe> = {
    'electronic': 'Electronic',
    'hip-hop': 'Hip-Hop',
    'hiphop': 'Hip-Hop',
    'hip hop': 'Hip-Hop',
    'house': 'House',
    'techno': 'Techno',
  };

  const eMap: Record<string, EnergyLevel> = { low: 'low', medium: 'medium', high: 'high' } as const;

  const vv = vMap[v];
  const ee = eMap[e as EnergyLevel];
  if (!vv) errors.push('Invalid vibe');
  if (!ee) errors.push('Invalid energyLevel');

  let trackCount = 10;
  if (trackCountRaw !== undefined) {
    const n = Number(trackCountRaw);
    if (!Number.isFinite(n) || n <= 0) errors.push('trackCount must be a positive number');
    else trackCount = Math.min(Math.floor(n), 20);
  }

  if (errors.length) {
    const error = new Error(errors.join(', '));
    (error as any).status = 400;
    throw error;
  }

  return { vibe: vv!, energyLevel: ee!, trackCount };
}

export function validateYouTubeSearch(query: any): { q: string; maxResults: number } {
  const q = String(query?.q ?? '').trim();
  const mr = query?.maxResults !== undefined ? Number(query?.maxResults) : 10;
  if (!q) {
    const error = new Error('Missing query');
    (error as any).status = 400;
    throw error;
  }
  const maxResults = Math.max(1, Math.min(50, Number.isFinite(mr) ? Math.floor(mr) : 10));
  return { q, maxResults };
}

