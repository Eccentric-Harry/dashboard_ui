// User store — the signed-in user's profile, shared by the app shell, the Profile
// page and the nutrition targets. App.tsx loads it once at boot.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors, remoteStateWith, requestAndSet, type RemoteDataStatus } from './zustand-utils';
import { userService } from '../services/user-service';
import type { SafeResult } from '../types/api';
import type { UserProfile } from '../types/user';

/** Fired whenever the persisted identity (avatar / display name) changes. */
export const PROFILE_UPDATED_EVENT = 'profile-updated';

const AVATAR_KEY = 'avatarUrl';
const DISPLAY_NAME_KEY = 'displayName';
const DEFAULT_AVATAR = 'luffy';

/**
 * The shell chrome (side rail, mobile trigger, route headers) reads identity from
 * localStorage so it can paint before the profile request settles. This is the one
 * place that keeps that copy in sync.
 */
function publishIdentity(profile: UserProfile): void {
  localStorage.setItem(AVATAR_KEY, profile.avatarUrl || DEFAULT_AVATAR);
  // Never overwrite a known name with an empty one (e.g. a guest session's placeholder).
  if (profile.displayName) localStorage.setItem(DISPLAY_NAME_KEY, profile.displayName);
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

interface UserState {
  profile: RemoteDataStatus<UserProfile | null>;
}

interface UserActions {
  actions: {
    /** Resolves with the loaded profile, or null if the read failed. */
    loadProfile: () => Promise<UserProfile | null>;
    saveProfile: (payload: Partial<UserProfile>) => Promise<SafeResult<UserProfile>>;
    saveLearnerProfile: (learnerProfile: string) => Promise<SafeResult<UserProfile>>;
    saveProteinTarget: (grams: number | null) => Promise<SafeResult<UserProfile>>;
  };
}

type UserStore = UserState & UserActions;

// App boot and the Profile page both load on mount; landing on /profile fired the same
// read twice. Callers that overlap share one request.
let profileLoadInFlight: Promise<UserProfile | null> | null = null;

const useUserStoreBase = create<UserStore>()(
  devtools(
    immer((set, get) => ({
      profile: remoteStateWith<UserProfile | null>(null),
      actions: {
        loadProfile: () => {
          profileLoadInFlight ??= (async () => {
            const res = await requestAndSet<UserStore, 'profile'>('profile', userService.getProfile, set);
            const profile = get().profile.data;
            if (res?.error || !profile) return null;
            publishIdentity(profile);
            return profile;
          })().finally(() => {
            profileLoadInFlight = null;
          });
          return profileLoadInFlight;
        },
        saveProfile: async (payload) => {
          const res = await userService.updateProfile(payload);
          const saved = res.data;
          if (!res.error && saved) {
            set((state) => {
              state.profile.data = saved;
              state.profile.loaded = true;
              state.profile.hasErrors = false;
            });
            publishIdentity(saved);
          }
          return res;
        },
        saveLearnerProfile: async (learnerProfile) => {
          const res = await userService.updateLearnerProfile(learnerProfile);
          const saved = res.data;
          if (!res.error && saved) {
            set((state) => {
              if (state.profile.data) state.profile.data.learnerProfile = saved.learnerProfile ?? null;
              else state.profile.data = saved;
            });
          }
          return res;
        },
        // The whole profile comes back: the override also moves the calculated
        // macro split (carbs absorb the difference).
        saveProteinTarget: async (grams) => {
          const res = await userService.updateProteinTarget(grams);
          const saved = res.data;
          if (!res.error && saved) {
            set((state) => {
              state.profile.data = saved;
            });
          }
          return res;
        },
      },
    })),
    { name: 'UserStore' },
  ),
);

export const useUserStore = createSelectors(useUserStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const userActions = useUserStoreBase.getState().actions;
