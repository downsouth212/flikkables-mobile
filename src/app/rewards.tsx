import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { BackHeader } from '@/features/game/components/back-header';
import { SpinWheel } from '@/features/game/components/rewards/spin-wheel';
import { useRewardsScreen } from '@/features/game/hooks/use-rewards-screen';

export default function RewardsScreen() {
  const s = useRewardsScreen();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
      <BackHeader title="🎁 Daily Rewards" />

      <Card>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-3xl">🔥</Text>
            <View>
              <Text className="text-sm text-muted">Daily Streak</Text>
              <Text className="text-2xl font-bold text-foreground">{s.streak} days</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-foreground">Day {s.cycleDay}/7</Text>
            <Text className="text-xs text-muted">Next: {s.next} stamps</Text>
          </View>
        </View>
        <View className="flex-row gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} className={cn('h-2 flex-1 rounded-full', i < s.cycleDay ? 'bg-accent' : 'bg-border')} />
          ))}
        </View>
        {s.streak >= 7 ? (
          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted">30-day milestone</Text>
              <Text className="text-xs text-muted">{s.streak % 30}/30 days</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-border">
              <View className="h-full rounded-full bg-gold" style={{ width: `${((s.streak % 30) / 30) * 100}%` }} />
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text className="text-lg font-bold text-foreground">🎯 Daily Quests</Text>
        {s.quests.map((q) => {
          const done = q.progress >= q.target;
          return (
            <View key={q.id} className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm font-semibold text-foreground">{q.title}</Text>
                <Text className="text-sm text-muted">
                  {Math.min(q.progress, q.target)}/{q.target}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-border">
                <View className="h-full rounded-full bg-accent" style={{ width: `${Math.min(q.progress / q.target, 1) * 100}%` }} />
              </View>
              {q.claimed ? (
                <Text className="text-sm font-semibold text-success">Completed!</Text>
              ) : done ? (
                <Button
                  size="sm"
                  isDisabled={s.claiming === q.id}
                  onPress={() => {
                    pressHaptic();
                    s.claim(q.id);
                  }}
                >
                  <Button.Label>Claim 20 stamps</Button.Label>
                </Button>
              ) : (
                <Text className="text-xs text-muted">Reward: 20 stamps</Text>
              )}
            </View>
          );
        })}
      </Card>

      <Card>
        <Text className="text-lg font-bold text-foreground">🎡 Daily Lucky Spin</Text>
        {s.spun ? (
          <View className="items-center gap-2 py-4">
            <Text className="text-5xl">🎡</Text>
            <Text className="text-xl font-bold text-foreground">Come Back Tomorrow!</Text>
            <Text className="text-center text-sm text-muted">
              {s.lastPrize ? `You won: ${s.lastPrize}` : 'Your next spin will be available in 24 hours'}
            </Text>
          </View>
        ) : (
          <View className="items-center gap-4">
            <SpinWheel target={s.target} onDone={s.spinDone} />
            <Button
              className="self-stretch"
              isDisabled={s.spinning}
              onPress={() => {
                pressHaptic();
                s.spin();
              }}
            >
              <Button.Label>{s.spinning ? 'Spinning...' : '🎰 SPIN NOW!'}</Button.Label>
            </Button>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
