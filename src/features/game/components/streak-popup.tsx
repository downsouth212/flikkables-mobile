import { Button } from 'heroui-native';
import { Text, View } from 'react-native';

import { GameDialog } from '@/features/game/components/game-dialog';
import type { StreakResult } from '@/features/game/types/game';

/** The web StreakTracker reward popup, shown once a day when Home opens. */
export function StreakPopup({ streak, onClose }: { streak: StreakResult | null; onClose: () => void }) {
  const reward = streak?.reward;
  return (
    <GameDialog isOpen={!!reward} onClose={onClose} title={`Day ${streak?.streak ?? 1} Streak! 🔥`}>
      <View className="items-center gap-2">
        <Text className="text-4xl font-bold text-gold">+{reward?.stamps ?? 0} stamps</Text>
        {reward?.bonus ? (
          <Text className="text-sm font-semibold text-foreground">
            Including +{reward.bonus} bonus for {streak?.streak}-day streak!
          </Text>
        ) : null}
        {reward?.reset ? <Text className="text-sm text-muted">Streak reset. Starting fresh! +5 stamps</Text> : null}
        <Text className="text-sm text-muted">Come back tomorrow to continue your streak!</Text>
      </View>
      <Button onPress={onClose}>
        <Button.Label>Awesome!</Button.Label>
      </Button>
    </GameDialog>
  );
}
