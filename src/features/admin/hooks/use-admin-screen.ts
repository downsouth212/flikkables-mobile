import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { confirmDelete } from '@/lib/confirm';
import type { AdminOverview, AdminPlayer, Battles, DropSpot } from '@/features/admin/types/admin';
import { adminApi } from '@/features/admin/utils/admin-api';
import { getFix } from '@/features/game/hooks/use-location';
import type { City } from '@/features/game/types/game';
import { CITIES } from '@/features/game/utils/cities';

export const ADMIN_TABS = ['invite', 'users', 'dummy', 'settings', 'drop'] as const;

export const BATTLES = [
  { key: 'flick_duel', icon: '⚡', name: 'Flick Duel', body: 'Both flick at same destination, first to land wins' },
  { key: 'pickup_race', icon: '🏃', name: 'Pickup Race', body: 'Characters placed randomly, closest one wins' },
  { key: 'timed_challenge', icon: '⏱️', name: 'Timed Challenge', body: 'Set destination and time limit, first to arrive wins' },
  { key: 'head_to_head', icon: '🎯', name: 'Head-to-Head', body: 'Rarity affects distance, race to destination' },
  { key: 'distance_derby', icon: '📏', name: 'Distance Derby', body: 'Flick any direction, furthest distance wins' },
  { key: 'location_chain', icon: '🌍', name: 'Location Chain', body: 'Alternate calling cities, most successful landings wins' },
  { key: 'survival_sprint', icon: '🏠', name: 'Survival Sprint', body: 'Most returns home in time limit wins' },
  { key: 'landmark_hunt', icon: '🗽', name: 'Landmark Hunt', body: 'First to reach 3 landmarks wins' },
] as const;

const ONLINE_MS = 5 * 60_000;

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
  const [tab, setTab] = useState<(typeof ADMIN_TABS)[number]>('users');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [dummyEmail, setDummyEmail] = useState('');
  const [dummyPassword, setDummyPassword] = useState('');
  const [dummyName, setDummyName] = useState('');
  const [features, setFeatures] = useState({ show_guilds: false, show_map: false, show_races: false });
  const [battles, setBattles] = useState<Battles>({});
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  const load = async () => {
    try {
      const next = await adminApi.overview();
      setData(next);
      setPickup(String(next.settings.pickup_radius_m));
      setNearby(String(next.settings.nearby_radius_km));
      setMaxOwned(String(next.settings.max_owned));
      setFeatures({
        show_guilds: next.settings.show_guilds === 1,
        show_map: next.settings.show_map === 1,
        show_races: next.settings.show_races === 1,
      });
      setBattles(next.battles ?? {});
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
      return 'Settings saved!';
    });

  const saveFeatures = () =>
    run('features', async () => {
      await adminApi.saveSettings({
        show_guilds: features.show_guilds ? 1 : 0,
        show_map: features.show_map ? 1 : 0,
        show_races: features.show_races ? 1 : 0,
      });
      return 'Feature settings saved!';
    });

  const toggleBattle = (key: string, on: boolean) => {
    const next = { ...battles, [key]: on };
    setBattles(next);
    void run('battles', async () => {
      await adminApi.saveBattles(next);
      return 'Battle settings updated';
    });
  };

  const invite = () =>
    run('invite', async () => {
      const email = inviteEmail.trim();
      if (!email) throw new Error('Please enter an email');
      const r = await adminApi.invite(email, inviteRole);
      setInviteEmail('');
      if (!r.emailed) return `${email} was added, but the email didn’t go out: ${r.reason ?? 'unknown reason'}.`;
      return `Invitation sent to ${email}!`;
    });

  const createDummy = () =>
    run('dummy', async () => {
      if (!dummyEmail.trim() || !dummyPassword || !dummyName.trim()) throw new Error('Please fill in all fields');
      await adminApi.dummy({ email: dummyEmail.trim(), password: dummyPassword, name: dummyName.trim() });
      const done = `Dummy user ${dummyName.trim()} created!`;
      setDummyEmail('');
      setDummyPassword('');
      setDummyName('');
      return done;
    });

  const setLocation = (p: AdminPlayer) =>
    run('home', async () => {
      const lat = Number(latInput);
      const lng = Number(lngInput);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || latInput === '' || lngInput === '') {
        throw new Error('Enter a latitude (−90 to 90) and longitude (−180 to 180).');
      }
      await adminApi.moveHome(p.user_id, { lat, lng, name: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
      setMovingHome(false);
      return `${p.display_name}’s location was updated.`;
    });

  const drop = () =>
    run('drop', async () => {
      const spot = dropSpot === 'city' ? dropCity : await getFix();
      if (!spot) throw new Error('Pikk a city to drop them in.');
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
    tab,
    setTab,
    invite: { email: inviteEmail, setEmail: setInviteEmail, role: inviteRole, setRole: setInviteRole, send: invite },
    dummy: {
      email: dummyEmail,
      setEmail: setDummyEmail,
      password: dummyPassword,
      setPassword: setDummyPassword,
      name: dummyName,
      setName: setDummyName,
      create: createDummy,
    },
    features,
    setFeature: (key: keyof typeof features, on: boolean) => setFeatures((f) => ({ ...f, [key]: on })),
    saveFeatures,
    battles,
    toggleBattle,
    online: (data?.players ?? []).filter((p) => p.last_seen_at && Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_MS).length,
    isOnline: (p: AdminPlayer) => Boolean(p.last_seen_at && Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_MS),
    latInput,
    setLatInput,
    lngInput,
    setLngInput,
    setLocation,
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
      const pl = data?.players.find((x) => x.user_id === id);
      setLatInput(pl ? String(pl.home_lat) : '');
      setLngInput(pl ? String(pl.home_lng) : '');
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
