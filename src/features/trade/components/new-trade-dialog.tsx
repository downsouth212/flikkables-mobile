import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Spinner, TextField, useThemeColor } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Pressable, pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { cn } from '@/lib/cn';
import { GameDialog } from '@/features/game/components/game-dialog';
import { useGameStore } from '@/features/game/store/game-store';
import type { Player } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';
import type { NewTradeOffer, TradeFlikkable } from '@/features/trade/types/trade';
import { tradeApi } from '@/features/trade/utils/trade-api';

type Mode = 'character' | 'stamps';

function PickRow({ f, selected, onPress }: { f: TradeFlikkable; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={f.name}>
      <View
        className={cn(
          'flex-row items-center gap-3 rounded-xl border-2 px-3 py-2',
          selected ? 'border-accent bg-accent/10' : 'border-border',
        )}
      >
        <Text className="text-2xl">{f.emoji}</Text>
        <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
          {f.name}
        </Text>
      </View>
    </Pressable>
  );
}

function PlayerPicker({
  label,
  player,
  onPick,
}: {
  label: string;
  player: Player | null;
  onPick: (p: Player | null) => void;
}) {
  const myID = useGameStore((s) => s.profile?.user_id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2 || player) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let live = true;
    const timer = setTimeout(() => {
      gameApi
        .players(q)
        .then((r) => (live ? setResults(r.players.filter((p) => p.user_id !== myID).slice(0, 5)) : undefined))
        .catch(() => (live ? setResults([]) : undefined))
        .finally(() => (live ? setSearching(false) : undefined));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, player, myID]);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      {player ? (
        <View className="flex-row items-center gap-3 rounded-xl border-2 border-accent bg-accent/10 px-3 py-2">
          <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
            {player.display_name}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              pressHaptic();
              setQuery('');
              onPick(null);
            }}
          >
            <Button.Label>Change</Button.Label>
          </Button>
        </View>
      ) : (
        <TextField>
          <Input
            className="leading-none"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by display name..."
            autoCapitalize="none"
            autoCorrect={false}
          />
        </TextField>
      )}
      {searching ? <Spinner /> : null}
      {!player && !searching && q.length >= 2 && results.length === 0 ? (
        <Text className="text-sm text-muted">No players found</Text>
      ) : null}
      {!player
        ? results.map((p) => (
            <Pressable key={p.user_id} onPress={() => onPick(p)} accessibilityLabel={p.display_name}>
              <View className="gap-0.5 rounded-xl border border-border px-3 py-2">
                <Text className="text-sm font-medium text-foreground">{p.display_name}</Text>
                {p.home_name ? <Text className="text-xs text-muted">{p.home_name}</Text> : null}
              </View>
            </Pressable>
          ))
        : null}
    </View>
  );
}

export function NewTradeDialog({
  isOpen,
  onClose,
  onSend,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (offer: NewTradeOffer) => Promise<boolean>;
}) {
  const muted = useThemeColor('muted');
  const [mode, setMode] = useState<Mode>('character');
  const [mine, setMine] = useState<TradeFlikkable[]>([]);
  const [theirs, setTheirs] = useState<TradeFlikkable[]>([]);
  const [offeredID, setOfferedID] = useState<string | null>(null);
  const [requestedID, setRequestedID] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loadingTheirs, setLoadingTheirs] = useState(false);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    tradeApi
      .options()
      .then((r) => setMine(r.mine))
      .catch(() => setMine([]));
  }, [isOpen]);

  useEffect(() => {
    setRequestedID(null);
    setTheirs([]);
    if (!player || mode !== 'character') return;
    let live = true;
    setLoadingTheirs(true);
    tradeApi
      .options(player.user_id)
      .then((r) => (live ? setTheirs(r.theirs) : undefined))
      .catch(() => (live ? setTheirs([]) : undefined))
      .finally(() => (live ? setLoadingTheirs(false) : undefined));
    return () => {
      live = false;
    };
  }, [player, mode]);

  const close = () => {
    setMode('character');
    setOfferedID(null);
    setRequestedID(null);
    setPlayer(null);
    setAmount('');
    onClose();
  };

  const stamps = Number(amount);
  const validStamps = /^\d+$/.test(amount) && stamps >= 1 && stamps <= 10000;
  const ready =
    offeredID !== null && player !== null && (mode === 'character' ? requestedID !== null : validStamps);

  const send = async () => {
    if (!offeredID || !player) return;
    setSending(true);
    const offer: NewTradeOffer =
      mode === 'character' && requestedID
        ? { offered_id: offeredID, requested_id: requestedID }
        : { offered_id: offeredID, to_user_id: player.user_id, stamp_amount: stamps };
    const ok = await onSend(offer);
    setSending(false);
    if (ok) close();
  };

  return (
    <GameDialog isOpen={isOpen} onClose={close} title="Create Trade Offer" scroll>
      <Segmented
        values={['character', 'stamps'] as const}
        value={mode}
        onChange={setMode}
        labels={['For Character', 'For Stamps']}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">Your Flikkable</Text>
        {mine.length === 0 ? (
          <Text className="text-sm text-muted">You have no Flikkables available to trade</Text>
        ) : null}
        {mine.map((f) => (
          <PickRow key={f.id} f={f} selected={offeredID === f.id} onPress={() => setOfferedID(f.id)} />
        ))}
      </View>

      <View className="items-center">
        <Ionicons name="swap-vertical" size={22} color={muted} />
      </View>

      <PlayerPicker label={mode === 'character' ? 'Trade With (Search)' : 'Send To (Search)'} player={player} onPick={setPlayer} />

      {mode === 'character' && player ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Their Flikkable</Text>
          {loadingTheirs ? <Spinner /> : null}
          {!loadingTheirs && theirs.length === 0 ? (
            <Text className="text-sm text-muted">They have no Flikkables available to trade</Text>
          ) : null}
          {theirs.map((f) => (
            <PickRow key={f.id} f={f} selected={requestedID === f.id} onPress={() => setRequestedID(f.id)} />
          ))}
        </View>
      ) : null}

      {mode === 'stamps' ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Stamps Required</Text>
          <TextField>
            <Input
              className="leading-none"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              placeholder="1 - 10000"
              keyboardType="number-pad"
            />
          </TextField>
        </View>
      ) : null}

      <Button
        isDisabled={!ready || sending}
        onPress={() => {
          pressHaptic();
          void send();
        }}
      >
        <Button.Label>{sending ? 'Sending...' : 'Send Offer'}</Button.Label>
      </Button>
    </GameDialog>
  );
}
