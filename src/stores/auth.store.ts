import { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { useOnboardingStore } from './onboarding.store'

interface IAuthStore {
  session: Session | null
  setSession: (session: Session | null) => void
  isSessionLoaded: boolean
  setIsSessionLoaded: (value: boolean) => void
}

export const useAuthStore = create<IAuthStore>((set) => ({
  session: null,
  setSession: (session: Session | null) => {
    // Before anything renders for this session, so no step reads the answers
    // of whoever used this browser last.
    if (session?.user?.id)
      useOnboardingStore.getState().claimFor(session.user.id)
    set({ session, isSessionLoaded: true })
  },
  isSessionLoaded: false,
  setIsSessionLoaded: (value: boolean) => set({ isSessionLoaded: value }),
}))
