import { Button, Spinner, useThemeColor } from 'heroui-native';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Fonts } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { AirmailStripe } from '@/features/game/components/airmail-stripe';
import { Postmark } from '@/features/game/components/postmark';
import { usePassportScreen } from '@/features/game/hooks/use-passport-screen';
import type { JourneyEvent } from '@/features/game/types/game';
import { formatKm, timeAgo } from '@/features/game/utils/geo';

const EVENT_LABEL: Record<JourneyEvent, string> = {
  created: 'Made',
  flicked: 'Flicked to',
  picked_up: 'Picked up in',
  returned: 'Sent home from',
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-2xl font-black text-foreground" style={{ fontFamily: Fonts?.rounded }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

export default function PassportScreen() {
  const s = usePassportScreen();
  const accent = useThemeColor('accent');
  const p = s.profile;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
      refreshControl={<RefreshControl refreshing={s.loading} onRefresh={s.load} tintColor={accent} />}
    >
      <Text className="text-3xl font-bold text-foreground">Passport</Text>

      <Card>
        <View className="-mx-4 -mt-4 overflow-hidden rounded-t-2xl">
          <AirmailStripe height={10} />
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-xl font-bold text-foreground">{p?.display_name}</Text>
            <Text className="text-sm text-muted">Home · {p?.home_name}</Text>
          </View>
          <View className="items-end">
            <Text className="text-4xl font-black text-accent" style={{ fontFamily: Fonts?.rounded }}>
              {p?.stamps ?? 0}
            </Text>
            <Text className="text-sm text-muted">stamps</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Stat value={String(p?.flick_count ?? 0)} label="Flicks" />
          <Stat value={formatKm(s.totalKm)} label="Flown" />
          <Stat value={String(s.cities)} label="Cities" />
          <Stat value={String(p?.picked_up_count ?? 0)} label="Found" />
        </View>
      </Card>

      <Section title="Daily stamp">
        <Card>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-lg font-semibold text-foreground">
                {p?.streak ?? 0} day streak {(p?.streak ?? 0) >= 3 ? '🔥' : ''}
              </Text>
              <Text className="text-sm text-muted">
                {s.claimedToday ? 'Come back tomorrow to keep it going.' : 'Claim a stamp every day. Streaks earn more.'}
              </Text>
            </View>
            {s.claimed !== null ? <Postmark top={`+${s.claimed}`} bottom="today" /> : null}
          </View>
          <Button
            onPress={() => {
              pressHaptic();
              void s.claimDaily();
            }}
            isDisabled={s.claimedToday || s.claiming}
          >
            {s.claiming ? (
              <Spinner color="white" />
            ) : (
              <Button.Label>{s.claimedToday ? 'Claimed today' : 'Claim today’s stamp'}</Button.Label>
            )}
          </Button>
        </Card>
      </Section>
      {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}

      <Section title="Journal">
        {s.journal.length > 0 ? (
          <Card list>
            {s.journal.slice(0, 20).map((e) => (
              <ListRow
                key={e.id}
                title={`${e.emoji}  ${e.name} · ${EVENT_LABEL[e.event]} ${e.place}`}
                subtitle={`${timeAgo(e.created_at)}${e.distance_km > 0 ? ` · ${formatKm(e.distance_km)}` : ''}`}
                right={<Text className="text-sm font-semibold text-accent">+{e.stamps}</Text>}
                onPress={() => s.open(e.flikkable_id)}
              />
            ))}
          </Card>
        ) : (
          <Text className="text-base text-muted">Every flick, find and return gets postmarked here.</Text>
        )}
      </Section>

      <Section title="Top travellers">
        <Card list>
          {s.leaders.map((l, i) => (
            <ListRow
              key={l.user_id}
              title={l.display_name}
              subtitle={`${l.flick_count} ${l.flick_count === 1 ? 'flick' : 'flicks'}`}
              left={
                <Text
                  className={cn('w-6 text-center text-base font-black', i < 3 ? 'text-accent' : 'text-muted')}
                  style={{ fontFamily: Fonts?.rounded }}
                >
                  {i + 1}
                </Text>
              }
              right={
                <Text className={cn('text-base font-semibold', l.user_id === s.user?.id ? 'text-accent' : 'text-foreground')}>
                  {l.stamps}
                </Text>
              }
            />
          ))}
        </Card>
      </Section>

      <Section title="Account">
        <Card list>
          <ListRow title={s.user?.email ?? ""} subtitle="Signed in" />
          {s.role ? (
            <ListRow title="Admin panel" subtitle={s.role === 'master' ? 'Master admin' : 'Admin'} onPress={s.openAdmin} />
          ) : null}
          <ListRow title="Sign out" onPress={s.signOut} />
          <ListRow title="Delete account" onPress={s.deleteAccount} />
        </Card>
      </Section>
    </ScrollView>
  );
}
