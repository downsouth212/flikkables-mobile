import { Ionicons } from '@expo/vector-icons';
import { Button, Spinner, useThemeColor } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Image } from '@/components/image';
import { ListRow } from '@/components/list-row';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Fonts } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { imageFade } from '@/lib/motion';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { Postmark } from '@/features/game/components/postmark';
import { WorldMap, type MapArc } from '@/features/game/components/world-map';
import { useFlikkableScreen } from '@/features/game/hooks/use-flikkable-screen';
import type { JourneyEvent } from '@/features/game/types/game';
import { postcardImageURL } from '@/features/game/utils/game-api';
import { formatKm, timeAgo } from '@/features/game/utils/geo';
import { distanceStar, nextDistanceGoal, RARITY_LABEL, RARITY_TEXT, statusLine } from '@/features/game/utils/rarity';

const EVENT_TITLE: Record<JourneyEvent, string> = {
  created: 'Made in',
  flicked: 'Landed in',
  picked_up: 'Pikked up in',
  returned: 'Sent home from',
};

export default function FlikkableScreen() {
  const s = useFlikkableScreen();
  const foreground = useThemeColor('foreground');
  const f = s.flikkable;

  const header = (
    <Pressable onPress={s.back} accessibilityLabel="Back">
      <View className="size-10 items-center justify-center">
        <Ionicons name="chevron-back" size={26} color={foreground} />
      </View>
    </Pressable>
  );

  if (!f) {
    return (
      <View className="flex-1 bg-background px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        {header}
        {s.error ? <Text className="text-base text-danger">{s.error}</Text> : <Spinner />}
      </View>
    );
  }

  const located = [...s.journeys].reverse().filter((j) => j.event === 'flicked' || j.event === 'returned');
  const arcs: MapArc[] = located.map((j, i) => {
    const prev = located[i - 1];
    const from = prev && prev.event !== 'returned' ? prev : { lat: f.home_lat, lng: f.home_lng };
    return { key: j.id, from: { lat: from.lat, lng: from.lng }, to: { lat: j.lat, lng: j.lng } };
  });
  const star = distanceStar(f.total_km);
  const goal = nextDistanceGoal(f.total_km);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
      {header}
      <View className="items-center gap-3">
        <View style={{ transform: [{ rotate: '-3deg' }] }}>
          <CreatureStamp emoji={f.emoji} rarity={f.rarity} size="lg" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>
            {f.name}
          </Text>
          <Text className={cn('text-sm font-semibold', RARITY_TEXT[f.rarity])}>
            {RARITY_LABEL[f.rarity]} · {f.owner_name}’s
          </Text>
          <Text className="text-base text-muted">{statusLine(f, s.myID ?? undefined)}</Text>
        </View>
      </View>

      <Card>
        <View className="flex-row">
          <View className="flex-1 items-center gap-0.5">
            <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }} numberOfLines={1} adjustsFontSizeToFit>
              {formatKm(f.total_km)}
            </Text>
            <Text className="text-xs text-muted">flown</Text>
          </View>
          <View className="flex-1 items-center gap-0.5">
            <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }} numberOfLines={1} adjustsFontSizeToFit>
              {f.places.length}
            </Text>
            <Text className="text-xs text-muted">cities</Text>
          </View>
          <View className="flex-1 items-center gap-0.5">
            <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }} numberOfLines={1} adjustsFontSizeToFit>
              {f.times_returned}
            </Text>
            <Text className="text-xs text-muted">trips home</Text>
          </View>
        </View>
        {star ? <Text className="text-center text-sm font-semibold text-gold">⭐ {star} distance star</Text> : null}
        {goal ? (
          <Text className="text-center text-sm text-muted">
            {formatKm(goal.goal - f.total_km)} to the {goal.label} distance star
          </Text>
        ) : null}
      </Card>

      <Section title="Route">
        <WorldMap
          home={{ lat: f.home_lat, lng: f.home_lng }}
          arcs={arcs}
          playKey={arcs[arcs.length - 1]?.key}
          pins={f.status === 'home' ? [] : [{ key: 'now', lat: f.current_lat, lng: f.current_lng, emoji: f.emoji }]}
        />
      </Section>

      <Section title="Postcards">
        {s.postcards.map((p) =>
          p.status === 'succeeded' && s.token ? (
            <Card
              key={p.id}
              media={
                <Image
                  source={{ uri: postcardImageURL(p.id), headers: { Authorization: `Bearer ${s.token}` } }}
                  className="aspect-[3/2] w-full"
                  contentFit="cover"
                  transition={imageFade}
                  accessibilityLabel={`Postcard from ${p.place}`}
                />
              }
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-base font-semibold text-foreground">Greetings from {p.place}</Text>
                <Postmark top={p.place.split(',')[0] ?? p.place} tone="navy" />
              </View>
            </Card>
          ) : (
            <Card key={p.id}>
              <View className="flex-row items-center gap-3">
                {p.status === 'failed' ? null : <Spinner />}
                <Text className="flex-1 text-base text-muted">
                  {p.status === 'failed'
                    ? `The postcard from ${p.place} didn’t print. ${p.error ?? ''}`
                    : `Printing a postcard from ${p.place}…`}
                </Text>
              </View>
            </Card>
          ),
        )}
        {s.postcards.length === 0 ? (
          <Card media={<Image source={require('@/assets/images/game/empty-postcard.jpg')} className="aspect-[3/2] w-full" contentFit="cover" />}>
            <Text className="text-base text-muted">Ask for a postcard and {f.name} sends one from where it is.</Text>
          </Card>
        ) : null}
        {s.canRequestPostcard ? (
          <Button
            variant="secondary"
            onPress={() => {
              pressHaptic();
              void s.requestPostcard();
            }}
            isDisabled={s.requesting}
          >
            {s.requesting ? <Spinner /> : <Button.Label>Get a postcard from {f.current_place.split(',')[0]}</Button.Label>}
          </Button>
        ) : null}
        {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}
      </Section>

      <Section title="Journey">
        <Card list>
          {s.journeys.map((j) => (
            <ListRow
              key={j.id}
              title={`${EVENT_TITLE[j.event]} ${j.place}`}
              subtitle={`${j.by_name} · ${timeAgo(j.created_at)}${j.distance_km > 0 ? ` · ${formatKm(j.distance_km)}` : ''}`}
            />
          ))}
        </Card>
      </Section>
    </ScrollView>
  );
}
