import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable } from '@/components/pressable';
import { BackHeader } from '@/features/game/components/back-header';
import { FeedingGame } from '@/features/game/components/games/feeding-game';
import { GroomingGame } from '@/features/game/components/games/grooming-game';
import { MemoryGame } from '@/features/game/components/games/memory-game';
import { GAMES, usePlayScreen } from '@/features/game/hooks/use-play-screen';

export default function PlayScreen() {
  const s = usePlayScreen();
  const emoji = s.f?.emoji ?? '🐾';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6"
      scrollEnabled={s.game === null}
    >
      <BackHeader title={`Play with ${s.f?.name ?? 'Flikkable'}`} subtitle="Choose a mini-game to boost happiness!" />
      {s.game === 'feeding' ? <FeedingGame key="feeding" emoji={emoji} onComplete={s.complete} onQuit={s.quit} /> : null}
      {s.game === 'grooming' ? <GroomingGame key="grooming" emoji={emoji} onComplete={s.complete} onQuit={s.quit} /> : null}
      {s.game === 'memory' ? <MemoryGame key="memory" onComplete={s.complete} onQuit={s.quit} /> : null}
      {s.game === null ? (
        <View className="gap-3">
          {GAMES.map((g) => (
            <Pressable key={g.id} onPress={() => s.setGame(g.id)} accessibilityLabel={g.name}>
              <Card>
                <View className="flex-row items-center gap-4">
                  <Text className="text-4xl">{g.emoji}</Text>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-lg font-bold text-foreground">{g.name}</Text>
                    <Text className="text-sm text-muted">{g.description}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
