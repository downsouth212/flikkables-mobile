import { Button } from 'heroui-native';
import { Text, View } from 'react-native';

import { pressHaptic } from '@/components/pressable';

interface GameHeaderProps {
  left: string;
  right: string;
  onQuit: () => void;
}

export function GameHeader({ left, right, onQuit }: GameHeaderProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-base font-bold text-foreground">{left}</Text>
      <Text className="text-base font-bold text-foreground">{right}</Text>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => {
          pressHaptic();
          onQuit();
        }}
      >
        <Button.Label>Quit</Button.Label>
      </Button>
    </View>
  );
}
