import { Button } from 'heroui-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';

import { GameDialog } from '@/features/game/components/game-dialog';
import { useGameStore } from '@/features/game/store/game-store';

function formatDistance(km: number) {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M`;
  if (km >= 1000) return `${(km / 1000).toFixed(0)}K`;
  return km.toString();
}

/** Milestone, level-up and trophy moments queued by a flick, shown one at a time. */
export function CelebrationOverlay() {
  const current = useGameStore((s) => s.celebrations[0]);
  const lastLanding = useGameStore((s) => s.lastLanding);
  const dismiss = useGameStore((s) => s.dismissCelebration);
  const visible = !!current && !lastLanding;

  useEffect(() => {
    if (!visible) return;
    Presets.System.notificationSuccess();
    if (current?.kind !== 'level') return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [visible, current, dismiss]);

  if (!current) return null;
  const title = current.kind === 'milestone' ? 'Milestone Reached!' : current.kind === 'level' ? 'You Just Leveled Up!' : 'Trophy Earned!';

  return (
    <GameDialog isOpen={visible} onClose={dismiss} title={title}>
      <View className="items-center gap-2">
        {current.kind === 'milestone' ? (
          <>
            <Text className="text-6xl">🎉</Text>
            <Text className="text-4xl font-bold text-gold">{formatDistance(current.km)} km</Text>
            <Text className="text-center text-sm text-muted">Your Flikkables have traveled an amazing distance!</Text>
          </>
        ) : null}
        {current.kind === 'level' ? (
          <>
            <Text className="text-6xl font-bold text-neon">{current.level}</Text>
            <Text className="text-sm text-muted">Keep it up! 🎉</Text>
          </>
        ) : null}
        {current.kind === 'trophy' ? (
          <>
            <Text className="text-6xl">{current.trophy.icon}</Text>
            <Text className="text-lg font-bold text-foreground">{current.trophy.name}</Text>
            <Text className="text-center text-sm text-muted">{current.trophy.description}</Text>
          </>
        ) : null}
      </View>
      <Button onPress={dismiss}>
        <Button.Label>Awesome!</Button.Label>
      </Button>
    </GameDialog>
  );
}
