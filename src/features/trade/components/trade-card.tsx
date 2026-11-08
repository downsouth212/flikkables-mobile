import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { RARITY_BORDER, RARITY_LABEL, RARITY_TEXT } from '@/features/game/utils/rarity';
import type { TradeAction } from '@/features/trade/hooks/use-trade-screen';
import type { TradeFlikkable, TradeOffer } from '@/features/trade/types/trade';

function Panel({ f, open, onToggle }: { f: TradeFlikkable; open: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} accessibilityLabel={f.name}>
      <View className={cn('items-center gap-1 rounded-2xl border-2 bg-background p-3', RARITY_BORDER[f.rarity])}>
        <Text className="text-4xl">{f.emoji}</Text>
        <Text className="text-center text-sm font-semibold text-foreground" numberOfLines={1}>
          {f.name}
        </Text>
        <Text className={cn('text-xs font-semibold', RARITY_TEXT[f.rarity])}>{RARITY_LABEL[f.rarity]}</Text>
        {open ? (
          <View className="w-full gap-0.5 pt-1">
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted">Distance</Text>
              <Text className="text-xs font-semibold text-foreground">{Math.round(f.total_km).toLocaleString()} km</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted">Cities</Text>
              <Text className="text-xs font-semibold text-foreground">{f.cities}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TradeCard({
  offer,
  incoming,
  stamps,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: {
  offer: TradeOffer;
  incoming: boolean;
  stamps: number;
  busy: TradeAction | null;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const muted = useThemeColor('muted');
  const [openID, setOpenID] = useState<string | null>(null);
  const toggle = (id: string) => setOpenID((cur) => (cur === id ? null : id));
  const amount = offer.stamp_amount;
  const short = incoming && amount !== null && stamps < amount;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
          {incoming ? `From ${offer.from.display_name}` : `To ${offer.to.display_name}`}
        </Text>
        {amount !== null ? (
          <View className="rounded-full bg-gold/15 px-2.5 py-1">
            <Text className="text-xs font-semibold text-gold">Stamp Trade ({amount} needed)</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Panel f={offer.offered} open={openID === offer.offered.id} onToggle={() => toggle(offer.offered.id)} />
        </View>
        <Ionicons name="swap-horizontal" size={22} color={muted} />
        <View className="flex-1">
          {offer.requested ? (
            <Panel
              f={offer.requested}
              open={openID === offer.requested.id}
              onToggle={() => toggle(offer.requested?.id ?? '')}
            />
          ) : (
            <View className="items-center gap-1 rounded-2xl border-2 border-gold bg-background p-3">
              <Text className="text-4xl">🛂</Text>
              <Text className="text-center text-sm font-semibold text-foreground">{amount} Stamps</Text>
            </View>
          )}
        </View>
      </View>

      {short ? (
        <Text className="text-center text-xs font-semibold text-danger">
          You need {amount} stamps but only have {stamps}
        </Text>
      ) : null}

      {incoming ? (
        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            isDisabled={busy !== null}
            onPress={() => {
              pressHaptic();
              onDecline();
            }}
          >
            <Button.Label>{busy === 'decline' ? 'Declining...' : 'Decline'}</Button.Label>
          </Button>
          <Button
            className="flex-1"
            isDisabled={busy !== null || short}
            onPress={() => {
              pressHaptic();
              onAccept();
            }}
          >
            <Button.Label>{busy === 'accept' ? 'Accepting...' : 'Accept'}</Button.Label>
          </Button>
        </View>
      ) : (
        <Button
          variant="danger-soft"
          isDisabled={busy !== null}
          onPress={() => {
            pressHaptic();
            onCancel();
          }}
        >
          <Button.Label>{busy === 'cancel' ? 'Canceling...' : 'Cancel Offer'}</Button.Label>
        </Button>
      )}
    </Card>
  );
}
