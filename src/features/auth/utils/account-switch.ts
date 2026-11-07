import type { QueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useProfileStore } from '@/stores/profile.store'

/**
 * Calls `onSwitch` when a different account signs in on this page. Signing in
 * does not reload the page, so whatever the last account loaded is still in
 * memory. Signing out alone does not count: the same person coming back can
 * keep it.
 */
export function watchAccountSwitch(onSwitch: () => void) {
  let lastUserId: string | null = null
  return (session: Session | null) => {
    const userId = session?.user?.id
    if (!userId) return
    if (lastUserId && lastUserId !== userId) onSwitch()
    lastUserId = userId
  }
}

/**
 * Drops what the last account loaded. The selection goes first so nothing
 * refetches with their profile id. Reset rather than clear: it also cancels
 * their requests still in flight and tells mounted queries to load again.
 */
export function forgetAccount(queryClient: QueryClient) {
  useProfileStore.getState().reset()
  void queryClient.resetQueries()
}
