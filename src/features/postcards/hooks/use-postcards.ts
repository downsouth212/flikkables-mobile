import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import type { Postcard } from '@/features/postcards/types/postcard';
import { postcardApi } from '@/features/postcards/utils/postcard-api';

const MAX_SIDE = 1400;

async function shrink(uri: string, width: number, height: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const ctx = ImageManipulator.manipulate(uri);
  if (scale < 1) ctx.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return out.uri;
}

async function takePhoto() {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, cameraType: ImagePicker.CameraType.front };
  if (cam.granted) {
    try {
      const shot = await ImagePicker.launchCameraAsync(options);
      if (shot.canceled) return null;
      return shot.assets[0] ?? null;
    } catch {
      // Simulators have no camera: fall back to the library.
    }
  }
  const lib = await ImagePicker.launchImageLibraryAsync(options);
  if (lib.canceled) return null;
  return lib.assets[0] ?? null;
}

export function usePostcards() {
  const [mine, setMine] = useState<Postcard[]>([]);
  const [received, setReceived] = useState<Postcard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [making, setMaking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await postcardApi.list();
      setMine(r.mine);
      setReceived(r.received);
    } catch {
      // keep the last list
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = mine.some((p) => p.status === 'queued' || p.status === 'running');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [pending]);

  const takeSelfie = async (flikkableID: string, locationName: string) => {
    setError(null);
    const asset = await takePhoto();
    if (!asset) return;
    setMaking(true);
    try {
      const uri = await shrink(asset.uri, asset.width, asset.height);
      const card = await postcardApi.create(uri, flikkableID, locationName);
      setMine((prev) => [card, ...prev]);
      Presets.System.notificationSuccess();
      setToast('Postcard saved to your gallery!');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make that postcard.');
    } finally {
      setMaking(false);
    }
  };

  const unsentFor = (flikkableID: string) =>
    mine.find((p) => p.flikkable_id === flikkableID && p.status === 'succeeded' && !p.sent_to_owner) ?? null;

  const send = async (id: string) => {
    const { postcard } = await postcardApi.send(id);
    setMine((prev) => prev.map((p) => (p.id === id ? postcard : p)));
  };

  return { mine, received, loaded, making, toast, error, setError, load, takeSelfie, unsentFor, send };
}

export type PostcardsState = ReturnType<typeof usePostcards>;
