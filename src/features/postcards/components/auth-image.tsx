import { View } from 'react-native';

import { Image } from '@/components/image';
import { useBearer } from '@/features/postcards/hooks/use-bearer';

export function AuthImage({ uri, className }: { uri: string; className?: string }) {
  const token = useBearer();
  if (!token) return <View className={className} />;
  return (
    <Image
      source={{ uri, headers: { Authorization: `Bearer ${token}` }, cacheKey: uri }}
      className={className}
      contentFit="cover"
      transition={200}
    />
  );
}
