import { Button, Input, Spinner, TextField } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { cn } from '@/lib/cn';
import { GameDialog } from '@/features/game/components/game-dialog';
import type { City, FlickTarget, Player } from '@/features/game/types/game';
import { CITIES } from '@/features/game/utils/cities';
import { gameApi } from '@/features/game/utils/game-api';

type Mode = 'random' | 'user' | 'city';
const MODES: Mode[] = ['random', 'user', 'city'];
const MODE_LABEL: Record<Mode, string> = { random: 'Random', user: 'User', city: 'City' };

function Choice({ selected, title, subtitle, onPress }: { selected: boolean; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={title}>
      <View className={cn('gap-0.5 rounded-xl border-2 p-3', selected ? 'border-accent bg-accent/10' : 'border-border')}>
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        {subtitle ? <Text className="text-xs text-muted">{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

/** The web FlickTargetSelector: send to a random city, a player's home, or a chosen city. */
export function FlickTargetSheet({ isOpen, onChoose }: { isOpen: boolean; onChoose: (target: FlickTarget | null) => void }) {
  const [mode, setMode] = useState<Mode>('random');
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [city, setCity] = useState<City | null>(null);

  const q = cityQuery.trim().toLowerCase();
  const cities = q.length < 2 ? [] : CITIES.filter((c) => `${c.name} ${c.country}`.toLowerCase().includes(q)).slice(0, 10);

  const search = async (text: string) => {
    setQuery(text);
    setPlayer(null);
    if (!text.trim()) {
      setPlayers([]);
      return;
    }
    setSearching(true);
    const result = await gameApi.players(text.trim()).catch(() => ({ players: [] as Player[] }));
    setPlayers(result.players);
    setSearching(false);
  };

  const reset = () => {
    setMode('random');
    setQuery('');
    setPlayers([]);
    setPlayer(null);
    setCityQuery('');
    setCity(null);
  };

  const finish = (target: FlickTarget | null) => {
    reset();
    onChoose(target);
  };

  const confirm = () => {
    if (mode === 'user' && player) return finish({ kind: 'player', userID: player.user_id, name: player.display_name });
    if (mode === 'city' && city) return finish({ kind: 'city', city: `${city.name}, ${city.country}` });
    finish({ kind: 'random' });
  };

  const disabled = (mode === 'user' && !player) || (mode === 'city' && !city);

  return (
    <GameDialog isOpen={isOpen} onClose={() => finish(null)} title="Choose Flikk Destination" description="Select where you want to send your Flikkable">
      <Segmented values={MODES} value={mode} onChange={setMode} labels={MODES.map((m) => MODE_LABEL[m])} />

      {mode === 'random' ? (
        <Text className="text-sm text-muted">Your Flikkable will be sent to a random city based on population and activity.</Text>
      ) : null}

      {mode === 'user' ? (
        <View className="gap-2">
          <TextField>
            <Input
              className="leading-none"
              placeholder="Search by display name..."
              value={query}
              onChangeText={search}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </TextField>
          {searching ? <Spinner /> : null}
          {players.map((p) => (
            <Choice key={p.user_id} selected={player?.user_id === p.user_id} title={p.display_name} subtitle={p.home_name} onPress={() => setPlayer(p)} />
          ))}
          {players.length === 0 && query && !searching ? (
            <Text className="text-sm text-muted">No users found matching that display name.</Text>
          ) : null}
        </View>
      ) : null}

      {mode === 'city' ? (
        <View className="gap-2">
          <TextField>
            <Input
              className="leading-none"
              placeholder="Search for any city in the world..."
              value={cityQuery}
              onChangeText={(t) => {
                setCityQuery(t);
                setCity(null);
              }}
              autoCorrect={false}
            />
          </TextField>
          {cities.length === 0 ? (
            <Text className="text-sm text-muted">{cityQuery.trim() ? 'No cities found. Try a different search.' : 'Type to search for any city...'}</Text>
          ) : null}
          {cities.map((c) => (
            <Choice
              key={`${c.name}-${c.country}`}
              selected={city?.name === c.name && city?.country === c.country}
              title={`🌐 ${c.name}`}
              subtitle={c.country}
              onPress={() => setCity(c)}
            />
          ))}
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <Button variant="secondary" className="flex-1" onPress={() => finish(null)}>
          <Button.Label>Cancel</Button.Label>
        </Button>
        <Button className="flex-1" isDisabled={disabled} onPress={confirm}>
          <Button.Label>Confirm</Button.Label>
        </Button>
      </View>
    </GameDialog>
  );
}
