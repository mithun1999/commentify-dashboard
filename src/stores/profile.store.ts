import { create } from 'zustand'
import { IProfile } from '@/features/users/interface/profile.interface'

interface ProfileStoreState {
  activeProfile: IProfile | null
  setActiveProfile: (profile: IProfile | null) => void
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile: IProfile | null) => set({ activeProfile: profile }),
}))


