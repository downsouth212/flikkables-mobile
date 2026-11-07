import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';
import type { Flikkable, Landing, Profile } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

export type LandingOrigin = 'launch' | 'explore';

interface GameStore {
  userID: string | null;
  profile: Profile | null;
  mine: Flikkable[];
  holding: Flikkable[];
  loaded: boolean;
  selectedID: string | null;
  lastLanding: { landing: Landing; flikkable: Flikkable; origin: LandingOrigin } | null;
  refresh: (userID: string) => Promise<void>;
  reset: () => void;
  select: (id: string) => void;
  setProfile: (profile: Profile) => void;
  upsert: (f: Flikkable) => void;
  flick: (
    id: string,
    from: { lat?: number; lng?: number },
    origin: LandingOrigin,
  ) => Promise<{ landing: Landing; flikkable: Flikkable }>;
  clearLanding: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      userID: null,
      profile: null,
      mine: [],
      holding: [],
      loaded: false,
      selectedID: null,
      lastLanding: null,
      refresh: async (userID) => {
        if (get().userID !== userID) {
          set({ userID, profile: null, mine: [], holding: [], loaded: false, selectedID: null });
        }
        const state = await gameApi.state();
        set({ profile: state.profile, mine: state.mine, holding: state.holding, loaded: true });
      },
      reset: () => set({ userID: null, profile: null, mine: [], holding: [], loaded: false, selectedID: null, lastLanding: null }),
      select: (id) => set({ selectedID: id }),
      setProfile: (profile) => set({ profile }),
      upsert: (f) => {
        const myID = get().userID;
        const mine = get().mine.filter((m) => m.id !== f.id);
        const holding = get().holding.filter((h) => h.id !== f.id);
        if (f.owner_id === myID) {
          set({ mine: [f, ...mine], holding });
          return;
        }
        if (f.picked_up_by === myID) {
          set({ mine, holding: [f, ...holding] });
          return;
        }
        set({ mine, holding });
      },
      flick: async (id, from, origin) => {
        const result = await gameApi.flick(id, from);
        get().upsert(result.flikkable);
        const stampsGained = result.landing.stamps;
        const profile = get().profile;
        if (profile) {
          set({ profile: { ...profile, stamps: profile.stamps + stampsGained, flick_count: profile.flick_count + 1 } });
        }
        set({ lastLanding: { ...result, origin } });
        return result;
      },
      clearLanding: () => set({ lastLanding: null }),
    }),
    {
      name: 'flikkables-game',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ userID: s.userID, profile: s.profile, mine: s.mine, holding: s.holding, loaded: s.loaded, selectedID: s.selectedID }),
    },
  ),
);
