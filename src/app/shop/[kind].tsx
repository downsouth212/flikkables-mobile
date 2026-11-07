import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { BackHeader } from '@/features/game/components/back-header';
import { useShopScreen } from '@/features/game/hooks/use-shop-screen';

export default function ShopScreen() {
  const s = useShopScreen();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
      <BackHeader
        title={s.kind === 'garden' ? 'Garden Shop' : 'Airport Shop'}
        right={<Text className="text-base font-bold text-foreground">🛂 {s.stamps}</Text>}
      />
      <Segmented values={s.tabs.map((t) => t.id)} value={s.tab} onChange={s.setTab} labels={s.tabs.map((t) => t.label)} />

      {s.shown.length === 0 ? <Text className="text-center text-sm text-muted">Coming soon!</Text> : null}
      <View className="gap-3">
        {s.shown.map((d) => {
          const owned = s.owned.has(d.id);
          const levelLocked = s.level < d.level_requirement;
          const locked = d.locked || levelLocked;
          return (
            <Card key={d.id}>
              <View className="flex-row items-center gap-3">
                <Text className="text-4xl">{d.emoji}</Text>
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-bold text-foreground">{d.name}</Text>
                  {d.description ? <Text className="text-xs text-muted">{d.description}</Text> : null}
                  {d.happiness_boost > 0 ? <Text className="text-xs text-success">+{d.happiness_boost} happiness/day</Text> : null}
                  {levelLocked ? <Text className="text-xs text-danger">🔒 Level {d.level_requirement} required</Text> : null}
                  <Text className="text-sm font-semibold text-gold">{d.stamp_cost} stamps</Text>
                </View>
                {owned ? (
                  <Text className="text-sm font-semibold text-success">Owned ✓</Text>
                ) : locked ? (
                  <Text className="text-sm font-semibold text-muted">Locked</Text>
                ) : (
                  <Button
                    size="sm"
                    isDisabled={s.buying === d.id || s.stamps < d.stamp_cost}
                    onPress={() => {
                      pressHaptic();
                      s.buy(d);
                    }}
                  >
                    <Button.Label>Buy</Button.Label>
                  </Button>
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
