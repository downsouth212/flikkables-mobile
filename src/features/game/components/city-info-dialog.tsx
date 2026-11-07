import { Button } from 'heroui-native';
import { Text, View } from 'react-native';

import { GameDialog } from '@/features/game/components/game-dialog';
import type { Flikkable } from '@/features/game/types/game';
import { CITIES } from '@/features/game/utils/cities';

/** The web CityInfoModal: where a landed Flikkable is visiting. */
export function CityInfoDialog({ f, onClose, onReturn }: { f: Flikkable | null; onClose: () => void; onReturn: () => void }) {
  const city = f ? CITIES.find((c) => `${c.name}, ${c.country}` === f.current_place) : undefined;
  return (
    <GameDialog isOpen={!!f} onClose={onClose} title={`📍 ${f?.current_place ?? ''}`}>
      <View className="items-center gap-1 rounded-xl bg-background p-4">
        <Text className="text-5xl">{f?.emoji}</Text>
        <Text className="text-lg font-bold text-foreground">{f?.name}</Text>
        <Text className="text-sm text-muted">is visiting here</Text>
      </View>
      {city ? (
        <View className="items-center gap-0.5 rounded-xl bg-background p-3">
          <Text className="text-xs text-muted">👥 Population</Text>
          <Text className="text-base font-bold text-foreground">{city.population.toLocaleString()}</Text>
        </View>
      ) : null}
      <Button onPress={onReturn}>
        <Button.Label>Return Home</Button.Label>
      </Button>
    </GameDialog>
  );
}
