import { Spinner } from 'heroui-native';
import { Text, View } from 'react-native';

import { useRemote } from '@/features/places/hooks/use-remote';
import { placesApi } from '@/features/places/utils/places-api';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-xl bg-background p-3">
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

export function OwnerCardView({ userID }: { userID: string }) {
  const { data: owner, loading, failed } = useRemote(userID, (id) => placesApi.owner(id).then((r) => r.owner));

  if (loading) {
    return (
      <View className="items-center py-6">
        <Spinner />
      </View>
    );
  }
  if (failed || !owner) return <Text className="text-sm text-muted">Couldn’t load this player. Try again in a bit.</Text>;

  return (
    <View className="gap-3">
      <View className="items-center gap-0.5">
        <Text className="text-xl font-bold text-foreground">{owner.display_name}</Text>
        <Text className="text-sm text-muted">🌍 {owner.country ?? owner.home_name}</Text>
      </View>
      <View className="flex-row gap-2">
        <Stat label="Flikkables" value={owner.flikkables.toLocaleString('en-US')} />
        <Stat label="Total km" value={owner.total_km.toLocaleString('en-US')} />
        <Stat label="Rank" value={owner.rank ? `#${owner.rank}` : '–'} />
      </View>
      {owner.rank ? (
        <Text className="text-center text-xs text-muted">
          #{owner.rank} of {owner.players} on the all-time Flikkrs leaderboard
        </Text>
      ) : null}
    </View>
  );
}
