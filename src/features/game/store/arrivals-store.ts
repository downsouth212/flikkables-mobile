import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

interface ArrivalsState {
  /** How many homecomings of each Flikkable the airport has already shown. */
  seen: Record<string, number>;
  markSeen: (id: string, times: number) => void;
}

export const useArrivalsStore = create<ArrivalsState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (id, times) => set((s) => ({ seen: { ...s.seen, [id]: times } })),
    }),
    { name: 'flikkables-arrivals', storage: createJSONStorage(() => zustandStorage) },
  ),
);
