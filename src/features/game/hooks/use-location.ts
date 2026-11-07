import * as Location from 'expo-location';
import { useState } from 'react';

export interface Fix {
  lat: number;
  lng: number;
}

export async function getFix(): Promise<Fix> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location is off for Flikkables. Turn it on in Settings to find Flikkables near you.');
  }
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

export async function placeName(fix: Fix): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: fix.lat, longitude: fix.lng });
    if (!place) return 'Home';
    const parts = [place.district ?? place.city ?? place.subregion, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Home';
  } catch {
    return 'Home';
  }
}

export function useLocation() {
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const next = await getFix();
      setFix(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t find your location.');
      return null;
    } finally {
      setLocating(false);
    }
  };

  return { fix, error, locating, locate };
}
