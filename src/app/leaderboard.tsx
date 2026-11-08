import { Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Segmented } from '@/components/segmented';
import { BackHeader } from '@/features/game/components/back-header';
import { LeaderboardRow } from '@/features/leaderboard/components/leaderboard-row';
import { RANKING_PERIODS, RANKING_TYPES, useLeaderboardScreen } from '@/features/leaderboard/hooks/use-leaderboard-screen';

const ABOUT = {
  flikkrs: [
    'Ranked by total kilometers traveled by all your Flikkables',
    'Track daily, weekly, and all-time distance records',
    'Compete globally and climb the rankings',
  ],
  pikkrs: ["Ranked by number of Flikkables you've Pikkd", 'Each Pikk counts toward your total', 'Become the ultimate Pikkr!'],
};

export default function LeaderboardScreen() {
  const s = useLeaderboardScreen();
  const flikkrs = s.type === 'flikkrs';

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        <BackHeader title="Leaderboard" subtitle={flikkrs ? 'Top Flikkrs' : 'Top Pikkrs'} />

        <Segmented values={RANKING_TYPES} value={s.type} onChange={s.setType} labels={['Top Flikkrs', 'Top Pikkrs']} />

        {s.me ? (
          <Card className="flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text className="text-sm text-muted">Your Rank</Text>
              <Text className="text-3xl font-bold text-accent">#{s.me.rank}</Text>
            </View>
            <View className="items-end gap-0.5">
              <Text className="text-sm text-muted">{flikkrs ? 'Total KMs' : 'Pikks'}</Text>
              <Text className="text-2xl font-bold text-foreground">{s.me.value.toLocaleString()}</Text>
            </View>
          </Card>
        ) : null}

        {flikkrs ? (
          <Segmented values={RANKING_PERIODS} value={s.period} onChange={s.setPeriod} labels={['Daily', 'Weekly', 'All Time']} />
        ) : null}

        {s.loading ? (
          <View className="items-center py-12">
            <Spinner />
          </View>
        ) : null}

        {!s.loading && s.leaders.length === 0 ? (
          <Card className="items-center py-8">
            <Text className="text-sm text-muted">No rankings yet. Be the first!</Text>
          </Card>
        ) : null}

        {!s.loading && s.leaders.length > 0 ? (
          <View className="gap-2">
            {s.leaders.map((p) => (
              <LeaderboardRow key={p.user_id} player={p} type={s.type} isMe={p.user_id === s.myID} />
            ))}
            {s.myRow ? (
              <View className="gap-2">
                <View className="h-px bg-border" />
                <LeaderboardRow player={s.myRow} type={s.type} isMe />
              </View>
            ) : null}
          </View>
        ) : null}

        <Card>
          <Text className="text-base font-semibold text-foreground">About the Leaderboard</Text>
          <View className="gap-2">
            {ABOUT[s.type].map((line) => (
              <View key={line} className="flex-row gap-2">
                <Text className="text-sm text-accent">•</Text>
                <Text className="flex-1 text-sm text-muted">{line}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
