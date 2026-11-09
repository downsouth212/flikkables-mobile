import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { GardenBed, BED_SPOTS } from '@/features/game/components/garden-bed';
import { Butterfly, Firefly, Ripple, TreatTray, WaterZone } from '@/features/game/components/garden-life';
import { GardenWanderer, type PositionRegistry } from '@/features/game/components/garden-wanderer';
import { SceneBackdrop, type SceneItem } from '@/features/game/components/scene-backdrop';
import { useGardenBeds } from '@/features/game/hooks/use-garden-beds';
import type { Flikkable } from '@/features/game/types/game';
import { isNight } from '@/features/game/utils/scene-depth';

const POND = { left: 5, top: 33, width: 35, height: 13 };
const FOUNTAIN = { left: 44, top: 14, width: 16, height: 12 };

/** The living garden: day and night follow the phone's clock, Flikkables wander or sleep. */
export function GardenScene({
  characters,
  items,
  onPet,
  onFeed,
  onDetails,
}: {
  characters: Flikkable[];
  items: SceneItem[];
  onPet: (f: Flikkable) => void;
  onFeed: (f: Flikkable) => void;
  onDetails: (f: Flikkable) => void;
}) {
  const [size, setSize] = useState(0);
  const [night, setNight] = useState(isNight());
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const registry = useRef<PositionRegistry>(new Map());
  const beds = useGardenBeds();

  useEffect(() => {
    const id = setInterval(() => setNight(isNight()), 60000);
    return () => clearInterval(id);
  }, []);

  const ripple = (x: number, y: number) => setRipples((all) => [...all.slice(-3), { id: Date.now() + Math.random(), x, y }]);

  const dropTreat = (x: number, y: number) => {
    let best: Flikkable | null = null;
    let bestDist = 12;
    for (const f of characters) {
      const pos = registry.current.get(f.id);
      if (!pos) continue;
      // The face sits above the feet, so aim a little higher than the stored floor position.
      const d = Math.hypot(pos.x.get() - x, pos.y.get() - 5 - y);
      if (d < bestDist) {
        best = f;
        bestDist = d;
      }
    }
    if (best) onFeed(best);
  };

  return (
    <View className="gap-2">
      <SceneBackdrop backdrop={night ? 'garden-night' : 'garden-day'} items={items} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
        {size ? (
          <>
            <WaterZone size={size} area={POND} onTap={ripple} />
            <WaterZone size={size} area={FOUNTAIN} onTap={ripple} />
            {ripples.map((r) => (
              <Ripple key={r.id} x={r.x} y={r.y} onDone={() => setRipples((all) => all.filter((x) => x.id !== r.id))} />
            ))}
            {BED_SPOTS.slice(0, beds.beds).map((spot, bed) => (
              <GardenBed
                key={bed}
                spot={spot}
                plant={beds.plants.find((p) => p.bed === bed)}
                onPlant={() => beds.plant(bed)}
                onPick={() => beds.pick(bed)}
                onGrowing={beds.growing}
              />
            ))}
            {characters.map((f, i) => (
              <GardenWanderer key={f.id} f={f} size={size} night={night} index={i} registry={registry} onPet={onPet} onDetails={onDetails} />
            ))}
            {night
              ? [0, 1, 2, 3, 4, 5, 6].map((i) => <Firefly key={i} size={size} seed={i} />)
              : [0, 1, 2].map((i) => <Butterfly key={i} size={size} seed={i} />)}
            <TreatTray size={size} onDrop={dropTreat} />
          </>
        ) : null}
      </SceneBackdrop>
      <Text className="text-center text-sm text-muted">
        {night
          ? '🌙 Night in your garden: your Flikkables are asleep. Tap to pet, drag the 🍪 to feed.'
          : 'Tap to pet · hold for details · drag the 🍪 to feed · tap a bed to plant'}
      </Text>
      {characters.length === 0 ? (
        <Text className="text-center text-sm text-muted">No Flikkables relaxing here yet. Move some in from the Airport.</Text>
      ) : null}
    </View>
  );
}
