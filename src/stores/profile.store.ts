import { create } from 'zustand'
import { IProfile } from '@/features/users/interface/profile.interface'

/**
 * How long a disconnected id is filtered out of the profile list on the
 * client. Long enough for any in-flight list response started before the
 * disconnect to land and be ignored; the next fresh fetch will not contain
 * the account anyway.
 */
const RECENTLY_DISCONNECTED_TTL_MS = 2 * 60 * 1000

interface ProfileStoreState {
  activeProfile: IProfile | null
  setActiveProfile: (profile: IProfile | null) => void
  /** Profile id -> time it was disconnected on this client. */
  recentlyDisconnected: Record<string, number>
  markDisconnected: (profileId: string) => void
  isRecentlyDisconnected: (profileId: string) => boolean
}

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  activeProfile: null,
  setActiveProfile: (profile: IProfile | null) => set({ activeProfile: profile }),
  recentlyDisconnected: {},
  markDisconnected: (profileId) =>
    set((state) => ({
      recentlyDisconnected: {
        ...state.recentlyDisconnected,
        [profileId]: Date.now(),
      },
    })),
  isRecentlyDisconnected: (profileId) => {
    const at = get().recentlyDisconnected[profileId]
    return Boolean(at && Date.now() - at < RECENTLY_DISCONNECTED_TTL_MS)
  },
}))

export function filterRecentlyDisconnected(
  profiles: IProfile[],
  recentlyDisconnected: Record<string, number>,
  now = Date.now()
): IProfile[] {
  const ids = Object.keys(recentlyDisconnected)
  if (ids.length === 0) return profiles
  return profiles.filter((profile) => {
    const at = recentlyDisconnected[profile._id]
    return !(at && now - at < RECENTLY_DISCONNECTED_TTL_MS)
  })
}
