import { Button, Input, Label, Spinner, Switch, TextField } from 'heroui-native';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Fonts } from '@/constants/theme';
import { useTemplatesScreen } from '@/features/admin/hooks/use-templates-screen';
import { RARITY_LABEL } from '@/features/game/utils/rarity';
import { AuthImage } from '@/features/postcards/components/auth-image';
import { templateImageURL } from '@/features/postcards/utils/postcard-api';
import type { Rarity } from '@/features/game/types/game';

export default function TemplatesScreen() {
  const s = useTemplatesScreen();
  const list = s.templates ?? [];

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-0.5">
        <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>Character Templates</Text>
        <Text className="text-sm text-muted">Generate Flikkstars players can create</Text>
      </View>

      <Card>
        <TextField>
          <Label>Style</Label>
          <Input
            className="leading-none"
            value={s.style}
            onChangeText={s.setStyle}
            placeholder="E.g., cute mascot characters for a travel game"
            returnKeyType="done"
          />
        </TextField>
        <TextField>
          <Label>How many (1-10)</Label>
          <Input className="leading-none" value={s.count} onChangeText={s.setCount} keyboardType="number-pad" returnKeyType="done" />
        </TextField>
        <Button
          onPress={() => {
            pressHaptic();
            void s.generate();
          }}
          isDisabled={s.busy !== null}
        >
          {s.busy === 'generate' ? <Spinner color="white" /> : <Button.Label>Generate Characters</Button.Label>}
        </Button>
      </Card>

      {s.notice ? <Text className="text-sm text-success">{s.notice}</Text> : null}
      {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}

      <Section title={`Template Library (${list.length})`}>
        {s.templates === null ? <Spinner /> : null}
        {s.templates !== null && list.length === 0 ? (
          <Text className="text-sm text-muted">No templates yet. Describe a style above to generate some.</Text>
        ) : null}
        {list.map((t) => (
          <Card key={t.id}>
            <View className="flex-row gap-3">
              {t.status === 'succeeded' ? (
                <AuthImage uri={templateImageURL(t.id)} className="size-20 rounded-xl" />
              ) : (
                <View className="size-20 items-center justify-center rounded-xl bg-background">
                  {t.status === 'failed' ? <Text className="text-2xl">⚠️</Text> : <Spinner />}
                </View>
              )}
              <View className="flex-1 gap-0.5">
                <Text className="text-lg text-foreground" style={{ fontFamily: Fonts?.display }}>{t.name}</Text>
                <Text className="text-xs text-muted">{RARITY_LABEL[t.rarity as Rarity] ?? t.rarity}</Text>
                {t.status === 'failed' ? <Text className="text-xs text-danger">{t.error ?? 'Generation failed'}</Text> : null}
                {t.status === 'queued' || t.status === 'running' ? <Text className="text-xs text-muted">Generating…</Text> : null}
              </View>
            </View>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base text-foreground">Published</Text>
              <Switch
                isSelected={t.is_published}
                isDisabled={t.status !== 'succeeded' || s.busy === t.id}
                onSelectedChange={(on) => void s.update(t, { is_published: on })}
                accessibilityLabel={`Publish ${t.name}`}
              />
            </View>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base text-foreground">🔒 Locked</Text>
              <Switch
                isSelected={t.is_locked}
                isDisabled={s.busy === t.id}
                onSelectedChange={(on) => void s.update(t, { is_locked: on })}
                accessibilityLabel={`Lock ${t.name}`}
              />
            </View>
            {t.is_locked ? (
              <View className="flex-row items-end gap-3">
                <TextField className="flex-1">
                  <Label>Stamp cost to unlock</Label>
                  <Input
                    className="leading-none"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    placeholder="100"
                    value={s.costs[t.id] ?? String(t.stamp_cost)}
                    onChangeText={(v) => s.setCosts({ ...s.costs, [t.id]: v })}
                  />
                </TextField>
                <Button
                  variant="secondary"
                  onPress={() => {
                    pressHaptic();
                    s.saveCost(t);
                  }}
                  isDisabled={s.busy === t.id}
                >
                  <Button.Label>Save</Button.Label>
                </Button>
              </View>
            ) : null}
            <Button variant="danger-soft" size="sm" onPress={() => s.askDelete(t)} isDisabled={s.busy === t.id}>
              <Button.Label>Delete</Button.Label>
            </Button>
          </Card>
        ))}
      </Section>
    </KeyboardAwareScrollView>
  );
}
