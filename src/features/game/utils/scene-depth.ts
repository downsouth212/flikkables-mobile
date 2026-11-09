/** Things further back (higher up the picture) are drawn smaller, so the painted scene reads in depth. */
export function depthScale(yPct: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, (yPct - 35) / 60));
  return 0.62 + t * 0.58;
}

/** The walkable floor of each painted backdrop, in percent of the scene. */
export const GROUND = {
  garden: { left: 10, right: 88, top: 52, bottom: 90 },
  airport: { left: 10, right: 90, top: 46, bottom: 90 },
} as const;

/** Night in the garden follows the phone's own clock and time zone. */
export function isNight(date = new Date()) {
  const h = date.getHours();
  return h < 6 || h >= 19;
}

export function randomIn(min: number, max: number) {
  return min + Math.random() * (max - min);
}
