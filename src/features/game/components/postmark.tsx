import { Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { cn } from '@/lib/cn';

/** A franking postmark: a double-ruled box of tracked monospace caps. */
export function Postmark({ top, bottom, tone = 'accent' }: { top: string; bottom?: string; tone?: 'accent' | 'navy' }) {
  const ink = tone === 'accent' ? 'text-accent' : 'text-navy';
  const ring = tone === 'accent' ? 'border-accent' : 'border-navy';
  return (
    <View className={cn('rounded-lg border-2 p-0.5', ring)}>
      <View className={cn('items-center gap-0.5 rounded-md border px-3 py-1.5', ring)}>
        <Text className={cn('text-sm font-bold tracking-widest', ink)} style={{ fontFamily: Fonts?.mono }}>
          {top.toUpperCase()}
        </Text>
        {bottom ? (
          <Text className={cn('text-xs font-semibold tracking-widest', ink)} style={{ fontFamily: Fonts?.mono }}>
            {bottom.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
