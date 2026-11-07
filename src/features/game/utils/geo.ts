export const MAP_WIDTH = 360;
export const MAP_HEIGHT = 150;

export function project(lat: number, lng: number) {
  return { x: lng + 180, y: Math.min(MAP_HEIGHT, Math.max(0, 90 - lat)) };
}

export function arcPath(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const a = project(fromLat, fromLng);
  const b = project(toLat, toLng);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const lift = Math.min(40, length * 0.35);
  const cx = (a.x + b.x) / 2;
  const cy = Math.max(2, (a.y + b.y) / 2 - lift);
  return { d: `M${a.x} ${a.y}Q${cx} ${cy} ${b.x} ${b.y}`, length: length * 1.25 };
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

export function formatCoords(lat: number, lng: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lng).toFixed(2)}°${ew}`;
}

export function cityOf(place: string) {
  return place.split(',')[0] ?? place;
}

export function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function timeUntil(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.ceil(minutes / 60)} h`;
}
