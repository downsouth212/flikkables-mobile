import { Button } from 'heroui-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Pressable, pressHaptic } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { GameDialog } from '@/features/game/components/game-dialog';
import type { Rarity } from '@/features/game/types/game';
import {
  CONTINENTS,
  DEFAULT_FILTER,
  isFiltered,
  PICKED_LABEL,
  SORT_LABEL,
  type AwayFilter,
  type PickedFilter,
  type SortKey,
} from '@/features/game/utils/away-filter';
import { RARITY_LABEL } from '@/features/game/utils/rarity';

const RARITIES: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

function Chips<T extends string>({ values, value, label, onChange }: { values: T[]; value: T; label: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {values.map((v) => (
        <Pressable key={v} onPress={() => onChange(v)} accessibilityLabel={label(v)}>
          <View className={cn('rounded-full border px-3 py-1.5', v === value ? 'border-accent bg-accent' : 'border-border bg-surface')}>
            <Text className={cn('text-xs font-semibold', v === value ? 'text-accent-foreground' : 'text-foreground')}>{label(v)}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** The web CharacterFilter: sort, direction, continent, rarity and who is carrying them. */
export function AwayFilterBar({ filter, onChange }: { filter: AwayFilter; onChange: (f: AwayFilter) => void }) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<AwayFilter>) => onChange({ ...filter, ...patch });

  return (
    <View className="flex-row items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        className="flex-1"
        onPress={() => {
          pressHaptic();
          setOpen(true);
        }}
      >
        <Button.Label>{`⚙️ Sort: ${SORT_LABEL[filter.sort]} ${filter.ascending ? '↑' : '↓'}`}</Button.Label>
      </Button>
      {isFiltered(filter) ? (
        <Button size="sm" variant="ghost" onPress={() => onChange(DEFAULT_FILTER)}>
          <Button.Label>Clear</Button.Label>
        </Button>
      ) : null}

      <GameDialog isOpen={open} onClose={() => setOpen(false)} title="Sort & Filter">
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted">Sort by</Text>
          <Chips values={Object.keys(SORT_LABEL) as SortKey[]} value={filter.sort} label={(v) => SORT_LABEL[v]} onChange={(sort) => set({ sort })} />
          <Chips
            values={['desc', 'asc']}
            value={filter.ascending ? 'asc' : 'desc'}
            label={(v) => (v === 'asc' ? '↑ Ascending' : '↓ Descending')}
            onChange={(v) => set({ ascending: v === 'asc' })}
          />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted">Continent</Text>
          <Chips values={CONTINENTS} value={filter.continent} label={(v) => (v === 'all' ? 'All Continents' : v)} onChange={(continent) => set({ continent })} />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted">Rarity</Text>
          <Chips values={RARITIES} value={filter.rarity} label={(v) => (v === 'all' ? 'All Rarities' : RARITY_LABEL[v])} onChange={(rarity) => set({ rarity })} />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted">Pikkd Up</Text>
          <Chips values={Object.keys(PICKED_LABEL) as PickedFilter[]} value={filter.picked} label={(v) => PICKED_LABEL[v]} onChange={(picked) => set({ picked })} />
        </View>
        <Button onPress={() => setOpen(false)}>
          <Button.Label>Done</Button.Label>
        </Button>
      </GameDialog>
    </View>
  );
}
