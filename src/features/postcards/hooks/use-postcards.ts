import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import type { Postcard } from '@/features/postcards/types/postcard';
import { postcardApi } from '@/features/postcards/utils/postcard-api';

// The postcard comes out at 768x1024, so a 1024 px photo keeps every detail it can use
// while uploading and processing much faster.
const MAX_SIDE = 1024;

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

  const pendingIDs = mine.filter((p) => p.status === 'queued' || p.status === 'running').map((p) => p.id);
  const pendingKey = pendingIDs.join(',');
  useEffect(() => {
    if (!pendingKey) return;
    const ids = pendingKey.split(',');
    const t = setInterval(() => {
      void Promise.all(
        ids.map(async (id) => {
          try {
            const { postcard } = await postcardApi.get(id);
            if (postcard.status === 'queued' || postcard.status === 'running') return;
            if (postcard.status === 'failed') {
              setMine((prev) => prev.filter((p) => p.id !== id));
              setError(postcard.error ?? 'Couldn’t make that postcard. Try another photo.');
              return;
            }
            setMine((prev) => prev.map((p) => (p.id === id ? postcard : p)));
            Presets.System.notificationSuccess();
          } catch {
            // try again on the next tick
          }
        }),
      );
    }, 2000);
    return () => clearInterval(t);
  }, [pendingKey]);

  const takeSelfie = async (flikkableID: string, locationName: string) => {
    setError(null);
    const asset = await takePhoto();
    if (!asset) return;
    setMaking(true);
    try {
      const uri = await shrink(asset.uri, asset.width, asset.height);
      const card = await postcardApi.create(uri, flikkableID, locationName);
      setMine((prev) => [card, ...prev]);
      setToast('Making your postcard… it appears in your gallery in a minute or so.');
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
