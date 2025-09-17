export type EnergyVariant = 'neon' | 'gradient' | 'default';

export function getEnergyColor(
  value: number,
  variant: EnergyVariant = 'default'
): string {
  const v = typeof value === 'number' ? value : 0;
  if (v >= 80) {
    if (variant === 'neon') return 'neon-text-green';
    if (variant === 'gradient') return 'text-gradient-accent';
    return 'text-green-400';
  }
  if (v >= 60) return 'text-yellow-400';
  if (v >= 40) return 'text-orange-400';
  return 'text-red-400';
}
