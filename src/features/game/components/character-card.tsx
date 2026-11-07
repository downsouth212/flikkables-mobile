import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { confirmDelete } from '@/lib/confirm';
import { GameDialog } from '@/features/game/components/game-dialog';
import type { Flikkable } from '@/features/game/types/game';
import { formatKm } from '@/features/game/utils/geo';
import { citiesStar, distanceStar, RARITY_BORDER, RARITY_LABEL, RARITY_TEXT, STATUS_LABEL, type Star } from '@/features/game/utils/rarity';

const STAR_ICON: Record<Exclude<Star, null>, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };
const STAR_NAME: Record<Exclude<Star, null>, string> = { bronze: 'Bronze Star', silver: 'Silver Star', gold: 'Gold Star' };

function fedToday(f: Flikkable) {
  return f.last_fed_at ? new Date(f.last_fed_at).toDateString() === new Date().toDateString() : false;
}

export function Hearts({ value }: { value: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-xs text-muted">Happiness</Text>
      <Text className="text-sm">{[1, 2, 3, 4, 5].map((i) => (i <= value ? '❤️' : '🤍')).join('')}</Text>
    </View>
  );
}

/** The web CharacterCard: avatar, rarity, stars, location, distance, status and the place actions. */
export function CharacterCard({
  f,
  myID,
  showOwner,
  distance,
  inGarden,
  inAirport,
  onPress,
  onJourney,
  onMoveToAirport,
  onMoveToGarden,
  onFeed,
  onPlay,
  onDelete,
}: {
  f: Flikkable;
  myID?: string;
  showOwner?: boolean;
  distance?: number;
  inGarden?: boolean;
  inAirport?: boolean;
  onPress?: () => void;
  onJourney?: () => void;
  onMoveToAirport?: () => void;
  onMoveToGarden?: () => void;
  onFeed?: () => void;
  onPlay?: () => void;
  onDelete?: () => void;
}) {
  const danger = useThemeColor('danger');
  const [starOpen, setStarOpen] = useState<'distance' | 'cities' | null>(null);
  const km = f.total_km || 0;
  const cities = new Set(f.places ?? []).size;
  const dStar = distanceStar(km);
  const cStar = citiesStar(cities);
  const status = f.status === 'landed' ? 'landed' : f.status;
  const canDelete = !!onDelete && f.status === 'home' && !inGarden && !inAirport && f.owner_id === myID;
  const tooSad = f.happiness < 3;

  const body = (
    <View className="gap-3">
      {inGarden && onMoveToAirport ? (
        <Button
          size="sm"
          variant="primary"
          isDisabled={tooSad}
          onPress={() => {
            pressHaptic();
            onMoveToAirport();
          }}
        >
          <Button.Label>{tooSad ? 'Character too sad to travel' : '✈ Flikk'}</Button.Label>
        </Button>
      ) : null}
      {inAirport && onMoveToGarden ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            pressHaptic();
            onMoveToGarden();
          }}
        >
          <Button.Label>🌳 Flikk</Button.Label>
        </Button>
      ) : null}

      <View className="flex-row gap-3">
        <View className={cn('size-14 items-center justify-center rounded-xl border-2 bg-background', RARITY_BORDER[f.rarity])}>
          <Text className="text-3xl">{f.emoji}</Text>
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {f.name}
            </Text>
            <Text className={cn('text-xs font-semibold', RARITY_TEXT[f.rarity])}>
              {f.rarity === 'legendary' ? '✨ ' : ''}
              {RARITY_LABEL[f.rarity]}
            </Text>
            {dStar ? (
              <Pressable onPress={() => setStarOpen('distance')} accessibilityLabel={STAR_NAME[dStar]}>
                <Text className="text-base">{STAR_ICON[dStar]}</Text>
              </Pressable>
            ) : null}
            {cStar ? (
              <Pressable onPress={() => setStarOpen('cities')} accessibilityLabel={`${STAR_NAME[cStar]} cities`}>
                <Text className="text-base">🏙️</Text>
              </Pressable>
            ) : null}
          </View>
          {showOwner ? <Text className="text-xs text-muted">Owner: {f.owner_name}</Text> : null}
          <Text className="text-xs text-muted" numberOfLines={1}>
            📍 {f.current_place || 'Unknown location'}
          </Text>
          {distance !== undefined ? <Text className="text-xs text-muted">{formatKm(distance)} away</Text> : null}
          <View className="flex-row items-center justify-between gap-2">
            {onJourney ? (
              <Pressable onPress={onJourney} accessibilityLabel="Journey history">
                <Text className="text-xs font-semibold text-neon">🧭 {formatKm(km)} traveled</Text>
              </Pressable>
            ) : (
              <Text className="text-xs text-muted">🧭 {formatKm(km)} traveled</Text>
            )}
            <Text className="text-xs font-semibold text-foreground">{STATUS_LABEL[status] ?? status}</Text>
          </View>
          {f.status === 'picked_up' && f.picked_up_by_name ? (
            <Text className="text-xs text-gold">Being carried by {f.picked_up_by_name}</Text>
          ) : null}
        </View>
        {canDelete ? (
          <Pressable
            accessibilityLabel={`Delete ${f.name}`}
            onPress={() =>
              confirmDelete({
                title: 'Delete Flikkable?',
                message: `Are you sure you want to delete ${f.name}? This action cannot be undone.`,
                onConfirm: () => onDelete?.(),
              })
            }
          >
            <View className="size-9 items-center justify-center">
              <Ionicons name="trash-outline" size={18} color={danger} />
            </View>
          </Pressable>
        ) : null}
      </View>

      {inGarden ? (
        <View className="gap-2">
          <Hearts value={f.happiness} />
          <View className="flex-row gap-2">
            {f.happiness < 5 ? (
              fedToday(f) ? (
                <Text className="flex-1 text-xs text-muted">Your Flikkable was already fed! Come back tomorrow</Text>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onPress={() => {
                    pressHaptic();
                    onFeed?.();
                  }}
                >
                  <Button.Label>🍴 Feed (1 🛂)</Button.Label>
                </Button>
              )
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onPress={() => {
                pressHaptic();
                onPlay?.();
              }}
            >
              <Button.Label>🎮 Play</Button.Label>
            </Button>
          </View>
        </View>
      ) : null}

      <GameDialog
        isOpen={starOpen !== null}
        onClose={() => setStarOpen(null)}
        title={starOpen === 'distance' && dStar ? STAR_NAME[dStar] : cStar ? `${STAR_NAME[cStar]}` : ''}
        description={
          starOpen === 'distance'
            ? `${f.name} has traveled an incredible ${Math.round(km).toLocaleString()} km!`
            : `${f.name} has visited ${cities} unique cities!`
        }
      >
        <View className="gap-1">
          {starOpen === 'distance' ? (
            <>
              <Text className="text-sm text-foreground">🥉 Bronze: 20,000 km</Text>
              <Text className="text-sm text-foreground">🥈 Silver: 50,000 km</Text>
              <Text className="text-sm text-foreground">🥇 Gold: 100,000 km</Text>
            </>
          ) : (
            <>
              <Text className="text-sm text-foreground">🥉 Bronze: 10 cities</Text>
              <Text className="text-sm text-foreground">🥈 Silver: 20 cities</Text>
              <Text className="text-sm text-foreground">🥇 Gold: 50 cities</Text>
            </>
          )}
        </View>
        <Button onPress={() => setStarOpen(null)}>
          <Button.Label>Got it!</Button.Label>
        </Button>
      </GameDialog>
    </View>
  );

  if (!onPress) return <Card className={cn('border-2', RARITY_BORDER[f.rarity])}>{body}</Card>;
  return (
    <Pressable onPress={onPress}>
      <Card className={cn('border-2', RARITY_BORDER[f.rarity])}>{body}</Card>
    </Pressable>
  );
}
