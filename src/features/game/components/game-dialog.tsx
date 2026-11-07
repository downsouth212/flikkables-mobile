import { Dialog } from 'heroui-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

/** The web's shadcn Dialog: a centred panel with a title, an optional line and its content. */
export function GameDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  scroll,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Long content (a scene, a list) scrolls inside a fixed-height panel. */
  scroll?: boolean;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close variant="ghost" />
          <View className="gap-1 pr-8">
            <Dialog.Title>{title}</Dialog.Title>
            {description ? <Dialog.Description>{description}</Dialog.Description> : null}
          </View>
          {scroll ? (
            <View className="max-h-[520px]">
              <ScrollView contentContainerClassName="gap-4">{children}</ScrollView>
            </View>
          ) : (
            children
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
