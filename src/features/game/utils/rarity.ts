import type { Flikkable, Rarity } from '@/features/game/types/game';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/** Token utility per rarity: the stamp's ink colour. */
export const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-muted',
  uncommon: 'text-teal-ink',
  rare: 'text-navy',
  epic: 'text-plum-ink',
  legendary: 'text-gold',
};

export const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-border',
  uncommon: 'border-teal-ink',
  rare: 'border-navy',
  epic: 'border-plum-ink',
  legendary: 'border-gold',
};

export const CREATURES = [
  '🦊', '🐼', '🐸', '🦉', '🐙', '🐢', '🦄', '🐧', '🦋', '🐨', '🐯', '🦁',
  '🐰', '🐹', '🐻', '🐷', '🐵', '🐤', '🦆', '🦇', '🐺', '🐝', '🐞', '🐌',
  '🦎', '🦖', '🦕', '🦑', '🦀', '🐡', '🐠', '🐬', '🐳', '🦈', '🐱', '🐶',
] as const;

export type Star = 'bronze' | 'silver' | 'gold' | null;

export function distanceStar(km: number): Star {
  if (km >= 100_000) return 'gold';
  if (km >= 50_000) return 'silver';
  if (km >= 20_000) return 'bronze';
  return null;
}

export function citiesStar(count: number): Star {
  if (count >= 50) return 'gold';
  if (count >= 20) return 'silver';
  if (count >= 10) return 'bronze';
  return null;
}

export function nextDistanceGoal(km: number) {
  if (km < 20_000) return { goal: 20_000, label: 'bronze' };
  if (km < 50_000) return { goal: 50_000, label: 'silver' };
  if (km < 100_000) return { goal: 100_000, label: 'gold' };
  return null;
}

export function statusLine(f: Flikkable, myID: string | undefined) {
  if (f.status === 'home') return 'At home';
  if (f.status === 'picked_up' && f.picked_up_by === myID) return `In your hands · from ${f.owner_name}`;
  if (f.status === 'picked_up') return `Pikked up by ${f.picked_up_by_name ?? 'someone'}`;
  return `Exploring ${f.current_place}`;
}
