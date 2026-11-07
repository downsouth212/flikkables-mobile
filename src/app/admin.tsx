import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, Input, Label, Spinner, TextField, useThemeColor } from 'heroui-native';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { confirmDelete } from '@/lib/confirm';
import { useAdminScreen } from '@/features/admin/hooks/use-admin-screen';
import type { City } from '@/features/game/types/game';

function CityPicker({ query, onQuery, cities, onPick }: { query: string; onQuery: (q: string) => void; cities: City[]; onPick: (c: City) => void }) {
  return (
    <View className="gap-3">
      <TextField>
        <Input className="leading-none" value={query} onChangeText={onQuery} placeholder="Search cities" />
      </TextField>
      <Card list>
        {cities.map((c) => (
          <ListRow key={c.name} title={c.name} subtitle={c.country} onPress={() => onPick(c)} />
        ))}
      </Card>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-2xl font-black text-foreground" style={{ fontFamily: Fonts?.rounded }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const s = useAdminScreen();
  const foreground = useThemeColor('foreground');
  const d = s.data;
  const p = s.selected;

  const press = (fn: () => void) => () => {
    pressHaptic();
    fn();
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Pressable onPress={s.back} accessibilityLabel="Back">
          <View className="size-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={foreground} />
          </View>
        </Pressable>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-3xl font-bold text-foreground">Admin</Text>
          {d ? (
            <Chip color={s.isMaster ? 'accent' : 'default'} variant="soft">
              <Chip.Label>{s.isMaster ? 'Master admin' : 'Admin'}</Chip.Label>
            </Chip>
          ) : null}
        </View>
      </View>

      {s.notice ? <Text className="text-sm font-semibold text-success">{s.notice}</Text> : null}
      {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}

      {d ? (
        <>
          <Card>
            <View className="flex-row">
              <Stat value={d.totals.players} label="players" />
              <Stat value={d.totals.flikkables} label="Flikkables" />
              <Stat value={d.totals.landed} label="out in the world" />
            </View>
          </Card>

          <Section title="Game rules">
            <Card>
              <TextField>
                <Label>Pickup distance (metres)</Label>
                <Input className="leading-none" keyboardType="number-pad" value={s.rules.pickup} onChangeText={s.rules.setPickup} />
              </TextField>
              <TextField>
                <Label>Radar range (km)</Label>
                <Input className="leading-none" keyboardType="number-pad" value={s.rules.nearby} onChangeText={s.rules.setNearby} />
              </TextField>
              <TextField>
                <Label>Most Flikkables a player can own</Label>
                <Input className="leading-none" keyboardType="number-pad" value={s.rules.maxOwned} onChangeText={s.rules.setMaxOwned} />
              </TextField>
              <Button onPress={press(() => void s.rules.save())} isDisabled={s.busy !== null}>
                {s.busy === 'settings' ? <Spinner color="white" /> : <Button.Label>Save rules</Button.Label>}
              </Button>
            </Card>
          </Section>

          <Section title="Drop Flikkables">
            <Card>
              <Segmented values={['here', 'city'] as const} labels={['Where I am', 'A city']} value={s.dropper.spot} onChange={s.dropper.setSpot} />
              {s.dropper.spot === 'city' ? (
                s.dropper.city ? (
                  <ListRow
                    title={`${s.dropper.city.name}, ${s.dropper.city.country}`}
                    subtitle="Tap to pick another city"
                    onPress={() => s.setCityQuery(' ')}
                  />
                ) : (
                  <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={s.dropper.setCity} />
                )
              ) : null}
              {s.dropper.spot === 'city' && s.dropper.city && s.cityQuery.length > 0 ? (
                <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={s.dropper.setCity} />
              ) : null}
              <View className="flex-row gap-3">
                <TextField className="flex-1">
                  <Label>How many</Label>
                  <Input className="leading-none" keyboardType="number-pad" value={s.dropper.count} onChangeText={s.dropper.setCount} />
                </TextField>
                <TextField className="flex-1">
                  <Label>Spread (m)</Label>
                  <Input className="leading-none" keyboardType="number-pad" value={s.dropper.spread} onChangeText={s.dropper.setSpread} />
                </TextField>
              </View>
              <Button onPress={press(() => void s.dropper.drop())} isDisabled={s.busy !== null}>
                {s.busy === 'drop' ? <Spinner color="white" /> : <Button.Label>Drop them</Button.Label>}
              </Button>
              <Button variant="ghost" onPress={s.dropper.clear} isDisabled={s.busy !== null}>
                <Button.Label>Clear all team drops</Button.Label>
              </Button>
            </Card>
          </Section>

          {s.isMaster ? (
            <Section title="Admins">
              <Card list>
                {d.admins.map((a) => (
                  <ListRow
                    key={a.email}
                    title={a.email}
                    subtitle={`${a.role === 'master' ? 'Master admin' : 'Admin'} · ${a.claimed ? 'signed in' : 'hasn’t signed in yet'}`}
                    onPress={
                      a.role === 'master'
                        ? undefined
                        : () =>
                            confirmDelete({
                              title: `Remove ${a.email}?`,
                              message: 'They lose access to this panel.',
                              confirmLabel: 'Remove admin',
                              onConfirm: () => s.removeAdmin(a.email),
                            })
                    }
                  />
                ))}
              </Card>
              <View className="flex-row items-end gap-3">
                <TextField className="flex-1">
                  <Label>Add an admin</Label>
                  <Input
                    className="leading-none"
                    value={s.newAdmin}
                    onChangeText={s.setNewAdmin}
                    placeholder="their@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </TextField>
                <Button onPress={press(() => void s.addAdmin())} isDisabled={s.busy !== null || s.newAdmin.trim().length === 0}>
                  <Button.Label>Add</Button.Label>
                </Button>
              </View>
            </Section>
          ) : null}

          <Section title="Players">
            {p ? (
              <Card>
                <View className="gap-0.5">
                  <Text className="text-lg font-semibold text-foreground">{p.display_name}</Text>
                  <Text className="text-sm text-muted">{p.email ?? 'No email on file'}</Text>
                  <Text className="text-sm text-muted">
                    Home: {p.home_name} · {p.stamps} stamps · {p.flick_count} flicks
                  </Text>
                  {p.locked ? <Text className="text-sm font-semibold text-danger">Paused</Text> : null}
                </View>
                {s.movingHome ? (
                  <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={(c) => void s.moveHome(p, c)} />
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onPress={press(() => s.setMovingHome(!s.movingHome))} isDisabled={s.busy !== null}>
                    <Button.Label>{s.movingHome ? 'Cancel move' : 'Move home'}</Button.Label>
                  </Button>
                  {p.role === 'master' ? null : (
                    <Button size="sm" variant="secondary" onPress={press(() => void s.toggleLock(p))} isDisabled={s.busy !== null}>
                      <Button.Label>{p.locked ? 'Unpause' : 'Pause'}</Button.Label>
                    </Button>
                  )}
                  {p.role === 'master' ? null : (
                    <Button size="sm" variant="danger-soft" onPress={() => s.resetPlayer(p)} isDisabled={s.busy !== null}>
                      <Button.Label>Reset player</Button.Label>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onPress={press(() => s.select(null))}>
                    <Button.Label>Done</Button.Label>
                  </Button>
                </View>
              </Card>
            ) : null}
            <TextField>
              <Input className="leading-none" value={s.playerQuery} onChangeText={s.setPlayerQuery} placeholder="Search name, email or home" autoCapitalize="none" />
            </TextField>
            <Card list>
              {s.players.slice(0, 50).map((pl) => (
                <ListRow
                  key={pl.user_id}
                  title={`${pl.display_name}${pl.role ? ' · admin' : ''}${pl.locked ? ' · paused' : ''}`}
                  subtitle={`${pl.email ?? 'no email'} · ${pl.home_name}`}
                  onPress={() => s.select(pl.user_id)}
                />
              ))}
            </Card>
            {s.players.length === 0 ? <Text className="text-sm text-muted">No players match.</Text> : null}
          </Section>
        </>
      ) : s.error ? null : (
        <Spinner />
      )}
    </KeyboardAwareScrollView>
  );
}
