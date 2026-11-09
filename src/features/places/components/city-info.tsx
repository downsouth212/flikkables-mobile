import { Ionicons } from '@expo/vector-icons';
import { Spinner, useThemeColor } from 'heroui-native';
import { Linking, Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { useRemote } from '@/features/places/hooks/use-remote';
import { placesApi } from '@/features/places/utils/places-api';

const mapsURL = (attraction: string, place: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${attraction} ${place}`)}`;

export function CityInfoSection({ place }: { place: string }) {
  const accent = useThemeColor('accent');
  const { data, loading, failed } = useRemote(place, (p) => placesApi.city(p).then((r) => r.city));

  return (
    <View className="gap-2 rounded-2xl border border-border p-3">
      <Text className="text-sm font-semibold text-foreground">📍 {place}</Text>
      {loading ? (
        <View className="flex-row items-center gap-2">
          <Spinner size="sm" />
          <Text className="text-xs text-muted">Finding top attractions…</Text>
        </View>
      ) : null}
      {data?.population ? (
        <Text className="text-xs text-muted">Population {data.population.toLocaleString('en-US')}</Text>
      ) : null}
      {data && data.attractions.length > 0 ? (
        <View className="gap-1">
          <Text className="text-xs font-semibold text-muted">Top attractions</Text>
          {data.attractions.map((a, i) => (
            <Pressable key={a} onPress={() => void Linking.openURL(mapsURL(a, place))} accessibilityLabel={`Open ${a} on Google`}>
              <View className="flex-row items-center gap-2 py-1">
                <Text className="w-4 text-xs text-muted">{i + 1}</Text>
                <Text className="flex-1 text-sm font-medium text-accent underline">{a}</Text>
                <Ionicons name="open-outline" size={14} color={accent} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {(data && data.attractions.length === 0) || failed ? (
        <Text className="text-xs text-muted">Attractions aren’t available right now. Try again in a bit.</Text>
      ) : null}
    </View>
  );
}
