import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { cn } from '@/lib/cn';
import type { RankedPlayer, RankingType } from '@/features/leaderboard/types/leaderboard';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardRow({ player, type, isMe }: { player: RankedPlayer; type: RankingType; isMe: boolean }) {
  return (
    <Card className={cn('flex-row items-center gap-3', isMe ? 'border-2 border-accent' : null)}>
      <View className="w-8 items-center">
        {MEDALS[player.rank] ? (
          <Text className="text-xl">{MEDALS[player.rank]}</Text>
        ) : (
          <Text className="text-sm font-bold text-muted">{player.rank}</Text>
        )}
      </View>
      <View className="size-10 items-center justify-center rounded-full bg-accent/15">
        <Text className="text-lg font-bold text-accent">{player.display_name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-foreground">
          {player.display_name || 'Anonymous'}
          {isMe ? <Text className="text-xs text-accent"> (You)</Text> : null}
        </Text>
        {type === 'flikkrs' ? <Text className="text-xs text-muted">{player.count ?? 0} flikks</Text> : null}
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold text-accent">{player.value.toLocaleString()}</Text>
        <Text className="text-xs text-muted">{type === 'flikkrs' ? 'km' : 'pikks'}</Text>
      </View>
    </Card>
  );
}
