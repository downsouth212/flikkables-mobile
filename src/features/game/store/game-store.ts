import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';
import type {
  AdminRole,
  FlickResult,
  FlickTarget,
  Flikkable,
  Landing,
  PlaceKind,
  Profile,
  Trophy,
} from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

export type LandingOrigin = 'launch' | 'explore';

export type Celebration =
  | { kind: 'milestone'; km: number }
  | { kind: 'level'; level: number }
  | { kind: 'trophy'; trophy: Trophy };

interface GameStore {
  userID: string | null;
  profile: Profile | null;
  role: AdminRole | null;
  mine: Flikkable[];
  holding: Flikkable[];
  online: number;
  loaded: boolean;
  selectedID: string | null;
  lastLanding: { landing: Landing; flikkable: Flikkable; origin: LandingOrigin } | null;
  celebrations: Celebration[];
  refresh: (userID: string) => Promise<void>;
  reset: () => void;
  select: (id: string | null) => void;
  setProfile: (profile: Profile) => void;
  upsert: (f: Flikkable) => void;
  addStamps: (n: number) => void;
  celebrate: (items: Celebration[]) => void;
  dismissCelebration: () => void;
  move: (ids: string[], to: PlaceKind) => Promise<void>;
  feed: (id: string) => Promise<void>;
  play: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  sendHome: (id: string) => Promise<number>;
  flick: (
    id: string,
    from: { lat?: number; lng?: number },
    origin: LandingOrigin,
    target?: FlickTarget,
  ) => Promise<FlickResult>;
  clearLanding: () => void;
}

const EMPTY = { profile: null, role: null, mine: [], holding: [], online: 0, loaded: false, selectedID: null, celebrations: [] };

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const resync = () => {
        const id = get().userID;
        if (id) get().refresh(id).catch(() => undefined);
      };
      return {
        userID: null,
        ...EMPTY,
        lastLanding: null,
        refresh: async (userID) => {
          if (get().userID !== userID) set({ userID, ...EMPTY });
          const state = await gameApi.state();
          set({
            profile: state.profile,
            role: state.role ?? null,
            mine: state.mine,
            holding: state.holding,
            online: state.online ?? 1,
            loaded: true,
          });
        },
        reset: () => set({ userID: null, ...EMPTY, lastLanding: null }),
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
        addStamps: (n) => {
          const profile = get().profile;
          if (profile) set({ profile: { ...profile, stamps: profile.stamps + n } });
        },
        celebrate: (items) => set({ celebrations: [...get().celebrations, ...items] }),
        dismissCelebration: () => set({ celebrations: get().celebrations.slice(1) }),
        move: async (ids, to) => {
          const { garden_ids } = await gameApi.move(ids, to);
          const profile = get().profile;
          if (profile) set({ profile: { ...profile, garden_ids } });
        },
        feed: async (id) => {
          const { flikkable } = await gameApi.feed(id);
          if (flikkable) get().upsert(flikkable);
          get().addStamps(-1);
        },
        play: async (id) => {
          const { flikkable } = await gameApi.play(id);
          if (flikkable) get().upsert(flikkable);
        },
        remove: async (id) => {
          await gameApi.remove(id);
          const profile = get().profile;
          set({
            mine: get().mine.filter((m) => m.id !== id),
            selectedID: get().selectedID === id ? null : get().selectedID,
            profile: profile ? { ...profile, garden_ids: profile.garden_ids.filter((g) => g !== id) } : null,
          });
        },
        sendHome: async (id) => {
          const { flikkable, stamps } = await gameApi.sendHome(id);
          get().upsert(flikkable);
          get().addStamps(stamps);
          resync();
          return stamps;
        },
        flick: async (id, from, origin, target) => {
          const body: { lat?: number; lng?: number; target_user_id?: string; city?: string } = { ...from };
          if (target?.kind === 'player') body.target_user_id = target.userID;
          if (target?.kind === 'city') body.city = target.city;
          const result = await gameApi.flick(id, body);
          get().upsert(result.flikkable);
          get().addStamps(result.landing.stamps);
          const items: Celebration[] = [];
          if (result.milestone) items.push({ kind: 'milestone', km: result.milestone });
          if (result.level_up) items.push({ kind: 'level', level: result.level_up });
          for (const trophy of result.trophies ?? []) items.push({ kind: 'trophy', trophy });
          set({ lastLanding: { landing: result.landing, flikkable: result.flikkable, origin }, selectedID: null });
          get().celebrate(items);
          resync();
          return result;
        },
        clearLanding: () => set({ lastLanding: null }),
      };
    },
    {
      name: 'flikkables-game',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        userID: s.userID,
        profile: s.profile,
        role: s.role,
        mine: s.mine,
        holding: s.holding,
        loaded: s.loaded,
        selectedID: s.selectedID,
      }),
    },
  ),
);
