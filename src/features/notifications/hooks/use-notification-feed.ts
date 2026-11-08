import { useEffect, useState } from 'react';

import type { GameNotification } from '@/features/notifications/types/notification';
import { notificationApi } from '@/features/notifications/utils/notification-api';

export function useNotifications() {
  const [items, setItems] = useState<GameNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const r = await notificationApi.list();
      setItems(r.notifications);
    } catch {
      // keep the last list
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void notificationApi.markRead(id).catch(() => undefined);
  };
  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    void notificationApi.markAllRead().catch(() => undefined);
  };
  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    void notificationApi.dismiss(id).catch(() => undefined);
  };
  const clearAll = () => {
    setItems([]);
    void notificationApi.clearAll().catch(() => undefined);
  };

  return { items, unread, open, setOpen, markRead, markAllRead, dismiss, clearAll };
}
