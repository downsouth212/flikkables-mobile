import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { BackHeader } from '@/features/game/components/back-header';
import { GameDialog } from '@/features/game/components/game-dialog';
import { useTrophiesScreen } from '@/features/game/hooks/use-trophies-screen';

export default function TrophiesScreen() {
  const s = useTrophiesScreen();

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        <BackHeader title="Trophy Room" subtitle="Collect trophies and exchange for stamps" />
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-xs uppercase text-muted">Total Trophies</Text>
            <Text className="text-2xl font-bold text-gold">{s.trophies.length}</Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs uppercase text-muted">Available</Text>
            <Text className="text-2xl font-bold text-accent">{s.ready.length}</Text>
          </Card>
        </View>

        {s.ready.length > 0 ? (
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">🏆 Ready to Exchange</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {s.ready.map((t) => (
                <View key={t.id} className="w-[48%]">
                  <Pressable onPress={() => s.setSelected(t)} accessibilityLabel={t.name}>
                    <Card>
                      <View className="items-center gap-1">
                        <Text className="text-4xl">{t.icon}</Text>
                        <Text className="text-center text-sm font-semibold text-foreground">{t.name}</Text>
                        <Text className="text-xs text-muted">{t.stamps_value} 🛂</Text>
                      </View>
                    </Card>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {s.exchanged.length > 0 ? (
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Exchanged ({s.exchanged.length})</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {s.exchanged.map((t) => (
                <View key={t.id} className="w-[48%] opacity-60">
                  <Card>
                    <View className="items-center gap-1">
                      <Text className="text-4xl">{t.icon}</Text>
                      <Text className="text-center text-sm font-semibold text-muted">{t.name}</Text>
                      <Text className="text-xs text-muted">Exchanged</Text>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {s.trophies.length === 0 ? (
          <Card>
            <View className="items-center gap-1 py-4">
              <Text className="text-5xl">🏆</Text>
              <Text className="text-base font-semibold text-foreground">No Trophies Yet</Text>
              <Text className="text-sm text-muted">Complete quests to earn trophies!</Text>
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <GameDialog isOpen={!!s.selected} onClose={() => s.setSelected(null)} title="Exchange Trophy?">
        <View className="items-center gap-2">
          <Text className="text-5xl">{s.selected?.icon}</Text>
          <Text className="text-xl font-semibold text-foreground">{s.selected?.name}</Text>
          <Text className="text-center text-sm text-muted">{s.selected?.description}</Text>
          <Text className="text-2xl font-bold text-gold">+10 🛂 Passport Stamps</Text>
        </View>
        <View className="flex-row gap-2">
          <Button variant="secondary" className="flex-1" onPress={() => s.setSelected(null)}>
            <Button.Label>Cancel</Button.Label>
          </Button>
          <Button
            className="flex-1"
            isDisabled={s.busy}
            onPress={() => {
              pressHaptic();
              s.exchange();
            }}
          >
            <Button.Label>{s.busy ? 'Exchanging...' : 'Exchange'}</Button.Label>
          </Button>
        </View>
      </GameDialog>
    </View>
  );
}
