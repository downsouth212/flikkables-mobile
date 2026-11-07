// The web UserStatusBar's level table.
const LEVEL_THRESHOLDS = [0, 10000, 20000, 30000, 50000, 70000, 100000, 150000];

export function levelThreshold(level: number) {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1]!;
  let current = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!;
  for (let i = LEVEL_THRESHOLDS.length; i < level; i++) current = current + 50000 + Math.floor(current * 0.1);
  return current;
}

export function levelProgress(level: number, km: number) {
  const next = levelThreshold(level + 1);
  const prev = level === 1 ? 0 : next / 4;
  const percent = Math.max(0, Math.min(100, ((km - prev) / (next - prev)) * 100));
  return { next, percent, remaining: Math.max(0, Math.round(next - km)) };
}
