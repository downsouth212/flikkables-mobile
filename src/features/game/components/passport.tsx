import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Postmark } from '@/features/game/components/postmark';
import type { Flikkable } from '@/features/game/types/game';
import { cityOf } from '@/features/game/utils/geo';

const TILTS = ['-6deg', '4deg', '-2deg', '7deg', '-4deg', '2deg'] as const;

/** A Flikkable's passport: one postmark for every city it has visited. */
export function Passport({ f }: { f: Flikkable }) {
  const cities = [...new Set(f.places.map(cityOf).filter(Boolean))];
  return (
    <Card>
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">🛂 {f.name}&apos;s passport</Text>
          <Text className="text-sm font-semibold text-muted">
            {cities.length} {cities.length === 1 ? 'stamp' : 'stamps'}
          </Text>
        </View>
        {cities.length === 0 ? (
          <Text className="text-sm text-muted">No stamps yet. Flikk it somewhere to earn the first one.</Text>
        ) : (
          <View className="flex-row flex-wrap justify-center gap-3">
            {cities.map((city, i) => (
              <View key={city} style={{ transform: [{ rotate: TILTS[i % TILTS.length] }] }}>
                <Postmark top={city} bottom={`Visit ${i + 1}`} tone={i % 2 === 0 ? 'accent' : 'navy'} />
              </View>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}
