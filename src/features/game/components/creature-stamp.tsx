import { FlikkableFace } from '@/features/game/components/flikkable-face';
import { useThemeColor } from 'heroui-native';
import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { cn } from '@/lib/cn';
import type { Rarity } from '@/features/game/types/game';
import { RARITY_BORDER } from '@/features/game/utils/rarity';

const EMOJI_SIZE = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-7xl', xl: 'text-8xl' } as const;
const BOX = { sm: 52, md: 76, lg: 148, xl: 188 } as const;

export function CreatureStamp({
  emoji,
  templateID,
  rarity,
  size = 'md',
  edge = 'background',
}: {
  emoji: string;
  templateID?: string | null;
  rarity: Rarity;
  size?: keyof typeof BOX;
  /** The colour behind the stamp, used to punch the perforations. */
  edge?: 'background' | 'surface';
}) {
  const paper = useThemeColor('surface');
  const behind = useThemeColor(edge);
  const box = BOX[size];
  const hole = Math.max(2, box / 26);
  const step = hole * 3;
  const count = Math.floor(box / step);
  const offsets = Array.from({ length: count + 1 }, (_, i) => (i * box) / count);

  return (
    <View style={{ width: box, height: box }} className="items-center justify-center">
      <Svg width={box} height={box} style={{ position: 'absolute' }}>
        <Rect x={0} y={0} width={box} height={box} fill={paper} />
        {offsets.map((o) => (
          <Circle key={`t${o}`} cx={o} cy={0} r={hole} fill={behind} />
        ))}
        {offsets.map((o) => (
          <Circle key={`b${o}`} cx={o} cy={box} r={hole} fill={behind} />
        ))}
        {offsets.map((o) => (
          <Circle key={`l${o}`} cx={0} cy={o} r={hole} fill={behind} />
        ))}
        {offsets.map((o) => (
          <Circle key={`r${o}`} cx={box} cy={o} r={hole} fill={behind} />
        ))}
      </Svg>
      <View
        style={{ width: box - hole * 5, height: box - hole * 5 }}
        className={cn('items-center justify-center rounded-sm border-2 bg-surface-secondary', RARITY_BORDER[rarity])}
      >
        <FlikkableFace emoji={emoji} templateID={templateID} size={EMOJI_SIZE[size]} />
      </View>
    </View>
  );
}
