import { Text } from 'react-native';

import { cn } from '@/lib/cn';
import { AuthImage } from '@/features/postcards/components/auth-image';
import { templateImageURL } from '@/features/postcards/utils/postcard-api';

const IMAGE = {
  'text-lg': 'size-6',
  'text-2xl': 'size-8',
  'text-3xl': 'size-10',
  'text-4xl': 'size-12',
  'text-5xl': 'size-16',
  'text-7xl': 'size-24',
  'text-8xl': 'size-32',
} as const;

/** A Flikkable's face: its emoji, or its Flikkstar artwork. */
export function FlikkableFace({
  emoji,
  templateID,
  size,
}: {
  emoji: string;
  templateID?: string | null;
  size: keyof typeof IMAGE;
}) {
  if (templateID) return <AuthImage uri={templateImageURL(templateID)} className={cn('rounded-lg', IMAGE[size])} />;
  return <Text className={size}>{emoji}</Text>;
}
