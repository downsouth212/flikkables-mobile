import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { confirmDelete } from '@/lib/confirm';
import type { AdminOverview, AdminPlayer, DropSpot } from '@/features/admin/types/admin';
import { adminApi } from '@/features/admin/utils/admin-api';
import { getFix } from '@/features/game/hooks/use-location';
import type { City } from '@/features/game/types/game';
import { CITIES } from '@/features/game/utils/cities';

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function useAdminScreen() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [pickup, setPickup] = useState('');
  const [nearby, setNearby] = useState('');
  const [maxOwned, setMaxOwned] = useState('');

  const [dropCount, setDropCount] = useState('5');
  const [dropSpread, setDropSpread] = useState('500');
  const [dropSpot, setDropSpot] = useState<DropSpot>('here');
  const [dropCity, setDropCity] = useState<City | null>(null);

  const [cityQuery, setCityQuery] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [movingHome, setMovingHome] = useState(false);
  const [newAdmin, setNewAdmin] = useState('');

  const load = async () => {
    try {
      const next = await adminApi.overview();
      setData(next);
      setPickup(String(next.settings.pickup_radius_m));
      setNearby(String(next.settings.nearby_radius_km));
      setMaxOwned(String(next.settings.max_owned));
      setError(null);
    } catch (err) {
      setError(message(err, 'Couldn’t load the admin panel.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (key: string, work: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const done = await work();
      Presets.System.notificationSuccess();
      setNotice(done);
      await load();
    } catch (err) {
      setError(message(err, 'That didn’t work.'));
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = () =>
    run('settings', async () => {
      await adminApi.saveSettings({
        pickup_radius_m: Number(pickup),
        nearby_radius_km: Number(nearby),
        max_owned: Number(maxOwned),
      });
      return 'Game rules saved. Players get them on their next scan.';
    });

  const drop = () =>
    run('drop', async () => {
      const spot = dropSpot === 'city' ? dropCity : await getFix();
      if (!spot) throw new Error('Pick a city to drop them in.');
      const place = dropSpot === 'city' && dropCity ? `${dropCity.name}, ${dropCity.country}` : undefined;
      const result = await adminApi.drop({
        lat: spot.lat,
        lng: spot.lng,
        count: Number(dropCount) || 5,
        radius_m: Number(dropSpread) || 500,
        place,
      });
      return `Dropped ${result.dropped} Flikkables around ${result.place}.`;
    });

  const clearDrops = () =>
    confirmDelete({
      title: 'Clear all team drops?',
      message: 'Every Flikkable dropped from here disappears, even ones players are holding.',
      confirmLabel: 'Clear drops',
      onConfirm: () =>
        void run('clear', async () => {
          const result = await adminApi.clearDrops();
          return `Removed ${result.removed} dropped Flikkables.`;
        }),
    });

  const players = (data?.players ?? []).filter((p) =>
    `${p.display_name} ${p.email ?? ''} ${p.home_name}`.toLowerCase().includes(playerQuery.trim().toLowerCase()),
  );
  const selected = data?.players.find((p) => p.user_id === selectedID) ?? null;

  const toggleLock = (p: AdminPlayer) =>
    run('lock', async () => {
      await adminApi.lock(p.user_id, !p.locked);
      return p.locked ? `${p.display_name} can play again.` : `${p.display_name} is paused.`;
    });

  const moveHome = (p: AdminPlayer, city: City) =>
    run('home', async () => {
      const name = `${city.name}, ${city.country}`;
      await adminApi.moveHome(p.user_id, { lat: city.lat, lng: city.lng, name });
      setMovingHome(false);
      return `${p.display_name}’s home is now ${name}.`;
    });

  const resetPlayer = (p: AdminPlayer) =>
    confirmDelete({
      title: `Reset ${p.display_name}?`,
      message: 'Their Flikkables, journeys and stamps are deleted. They keep their sign-in and start over.',
      confirmLabel: 'Reset player',
      onConfirm: () =>
        void run('reset', async () => {
          await adminApi.resetPlayer(p.user_id);
          setSelectedID(null);
          return `${p.display_name} was reset.`;
        }),
    });

  const addAdmin = () =>
    run('add-admin', async () => {
      await adminApi.addAdmin(newAdmin);
      const email = newAdmin.trim().toLowerCase();
      setNewAdmin('');
      return `${email} is now an admin.`;
    });

  const removeAdmin = (email: string) =>
    void run('remove-admin', async () => {
      await adminApi.removeAdmin(email);
      return `${email} is no longer an admin.`;
    });

  const cities = CITIES.filter((c) =>
    `${c.name} ${c.country}`.toLowerCase().includes(cityQuery.trim().toLowerCase()),
  ).slice(0, 5);

  return {
    back: () => router.back(),
    data,
    error,
    notice,
    busy,
    isMaster: data?.me.role === 'master',
    rules: { pickup, setPickup, nearby, setNearby, maxOwned, setMaxOwned, save: saveSettings },
    dropper: {
      count: dropCount,
      setCount: setDropCount,
      spread: dropSpread,
      setSpread: setDropSpread,
      spot: dropSpot,
      setSpot: setDropSpot,
      city: dropCity,
      setCity: (c: City) => {
        setDropCity(c);
        setCityQuery('');
      },
      drop,
      clear: clearDrops,
    },
    cityQuery,
    setCityQuery,
    cities,
    players,
    playerQuery,
    setPlayerQuery,
    selected,
    select: (id: string | null) => {
      setSelectedID(id);
      setMovingHome(false);
    },
    movingHome,
    setMovingHome,
    toggleLock,
    moveHome,
    resetPlayer,
    newAdmin,
    setNewAdmin,
    addAdmin,
    removeAdmin,
  };
}
