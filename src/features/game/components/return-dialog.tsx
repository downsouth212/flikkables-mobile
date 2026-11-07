import { Button } from 'heroui-native';
import { Text, View } from 'react-native';

import { GameDialog } from '@/features/game/components/game-dialog';
import { returnWaitMs } from '@/features/game/hooks/use-home-screen';
import type { Flikkable } from '@/features/game/types/game';

/** The web return confirmation: shows the cooldown until a Flikkable can come home. */
export function ReturnDialog({
  f,
  busy,
  onClose,
  onConfirm,
}: {
  f: Flikkable | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const wait = f ? returnWaitMs(f) : 0;
  const hours = Math.ceil(wait / 3600_000);
  return (
    <GameDialog isOpen={!!f} onClose={onClose} title="Return Flikkable Home?">
      {wait > 0 ? (
        <View className="gap-2">
          <View className="items-center gap-1 rounded-xl bg-gold/15 p-4">
            <Text className="text-sm font-semibold text-foreground">⏱️ Ready in:</Text>
            <Text className="text-2xl font-bold text-gold">{hours}h remaining</Text>
          </View>
          <Text className="text-sm text-muted">Come back after the cooldown expires to return {f?.name} home.</Text>
        </View>
      ) : (
        <Text className="text-sm text-muted">Bring {f?.name} back home? They&apos;ll be ready for another adventure!</Text>
      )}
      <View className="flex-row gap-2">
        <Button variant="secondary" className="flex-1" onPress={onClose}>
          <Button.Label>Cancel</Button.Label>
        </Button>
        <Button className="flex-1" isDisabled={wait > 0 || busy} onPress={onConfirm}>
          <Button.Label>{busy ? 'Returning...' : 'Return Home'}</Button.Label>
        </Button>
      </View>
    </GameDialog>
  );
}
