import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The red/blue chevron band along an airmail envelope's edge. */
export function AirmailStripe({ height = 8 }: { height?: number }) {
  const [width, setWidth] = useState(0);
  const red = useThemeColor('accent');
  const scheme = useColorScheme();
  const navy = Colors[scheme === 'dark' ? 'dark' : 'light'].navy;
  const w = height * 2.4;
  const count = Math.ceil(width / w) + 2;

  return (
    <View className="w-full overflow-hidden" style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {Array.from({ length: count }, (_, i) => {
          const x = i * w - w / 2;
          const points = `${x},${height} ${x + w / 2},0 ${x + w},0 ${x + w / 2},${height}`;
          return <Polygon key={i} points={points} fill={i % 2 === 0 ? red : navy} />;
        })}
      </Svg>
    </View>
  );
}
