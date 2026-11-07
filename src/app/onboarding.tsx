import { Button, Input, Label, Spinner, TextField } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { CITIES } from '@/features/game/utils/cities';
import { pressHaptic } from '@/components/pressable';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { WorldMap } from '@/features/game/components/world-map';
import { placeName, useLocation } from '@/features/game/hooks/use-location';
import { useGameStore } from '@/features/game/store/game-store';
import { gameApi } from '@/features/game/utils/game-api';
import { formatCoords } from '@/features/game/utils/geo';

export default function OnboardingScreen() {
  const { user, signOut } = useAuth();
  const refresh = useGameStore((s) => s.refresh);
  const { fix, setFix, error: locationError, locating, locate } = useLocation();
  const [name, setName] = useState(user?.name ?? '');
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const matches = CITIES.filter((c) =>
    `${c.name} ${c.country}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).slice(0, 6);
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findHome = async () => {
    pressHaptic();
    const next = await locate();
    if (next) setPlace(await placeName(next));
  };

  const save = async () => {
    pressHaptic();
    if (!fix || !user) return;
    if (name.trim().length === 0) return setError('Pick a name other players will see.');
    setSaving(true);
    setError(null);
    try {
      await gameApi.saveProfile({ display_name: name.trim(), home_lat: fix.lat, home_lng: fix.lng, home_name: place || 'Home' });
      await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save your home spot.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 pt-6">
        <Text className="text-3xl font-bold text-foreground">Set your home spot</Text>
        <Text className="text-base text-muted">
          Every Flikkable you make starts here, and comes back here when it’s sent home. You’ll get a starter
          Flikkable to flick right away.
        </Text>
      </View>
      <TextField>
        <Label>Player name</Label>
        <Input className="leading-none" value={name} onChangeText={setName} placeholder="What other players see" />
      </TextField>
      <Card>
        <WorldMap home={fix ?? undefined} pins={fix ? [{ key: 'home', lat: fix.lat, lng: fix.lng, emoji: '🏠' }] : []} />
        {fix ? (
          <View className="gap-0.5">
            <Text className="text-lg font-semibold text-foreground">{place || 'Home'}</Text>
            <Text className="text-sm text-muted" style={{ fontFamily: Fonts?.mono }}>
              {formatCoords(fix.lat, fix.lng)}
            </Text>
          </View>
        ) : (
          <Text className="text-base text-muted">We only use your location to set home and to find Flikkables near you.</Text>
        )}
        {locationError ? <Text className="text-sm text-danger">{locationError}</Text> : null}
        <Button variant={fix ? 'secondary' : 'primary'} onPress={findHome} isDisabled={locating}>
          {locating ? <Spinner /> : <Button.Label>{fix ? 'Locate again' : 'Use my location'}</Button.Label>}
        </Button>
        {picking ? null : (
          <Button
            variant="ghost"
            onPress={() => {
              pressHaptic();
              setPicking(true);
            }}
          >
            <Button.Label>Pick a city instead</Button.Label>
          </Button>
        )}
      </Card>
      {picking ? (
        <View className="gap-3">
          <TextField>
            <Label>Home city</Label>
            <Input className="leading-none" value={query} onChangeText={setQuery} placeholder="Search cities" />
          </TextField>
          <Card list>
            {matches.map((c) => (
              <ListRow
                key={c.name}
                title={c.name}
                subtitle={c.country}
                onPress={() => {
                  setFix({ lat: c.lat, lng: c.lng });
                  setPlace(`${c.name}, ${c.country}`);
                  setPicking(false);
                }}
              />
            ))}
          </Card>
          {matches.length === 0 ? <Text className="text-sm text-muted">No city by that name yet.</Text> : null}
        </View>
      ) : null}
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button size="lg" onPress={save} isDisabled={!fix || saving}>
        {saving ? <Spinner color="white" /> : <Button.Label>Start playing</Button.Label>}
      </Button>
      <Button
        variant="ghost"
        onPress={() => {
          pressHaptic();
          void signOut();
        }}
      >
        <Button.Label>Use a different account</Button.Label>
      </Button>
    </KeyboardAwareScrollView>
  );
}
