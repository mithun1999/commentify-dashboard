import { QueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { useProfileStore } from '@/stores/profile.store'
import type { IProfile } from '@/features/users/interface/profile.interface'
import { forgetAccount, watchAccountSwitch } from './account-switch'

const sessionFor = (id: string) => ({ user: { id } }) as Session

const watch = () => {
  const onSwitch = vi.fn()
  return { onSwitch, note: watchAccountSwitch(onSwitch) }
}

describe('watchAccountSwitch', () => {
  it('stays quiet for the first account on the page', () => {
    const { onSwitch, note } = watch()
    note(null)
    note(sessionFor('a'))
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('stays quiet on a token refresh', () => {
    const { onSwitch, note } = watch()
    note(sessionFor('a'))
    note(sessionFor('a'))
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('stays quiet when the same account signs back in', () => {
    const { onSwitch, note } = watch()
    note(sessionFor('a'))
    note(null)
    note(sessionFor('a'))
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('fires when a different account signs in after a sign-out', () => {
    const { onSwitch, note } = watch()
    note(sessionFor('a'))
    note(null)
    note(sessionFor('b'))
    expect(onSwitch).toHaveBeenCalledTimes(1)
  })

  // Another tab signing in reaches this one with no sign-out in between.
  it('fires when the account changes with no sign-out', () => {
    const { onSwitch, note } = watch()
    note(sessionFor('a'))
    note(sessionFor('b'))
    expect(onSwitch).toHaveBeenCalledTimes(1)
  })

  it('fires again on the way back', () => {
    const { onSwitch, note } = watch()
    note(sessionFor('a'))
    note(sessionFor('b'))
    note(sessionFor('a'))
    expect(onSwitch).toHaveBeenCalledTimes(2)
  })
})

describe('forgetAccount', () => {
  it('drops the cached data and the selected profile', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['get-user'], { firstName: 'Maya' })
    useProfileStore.getState().setActiveProfile({ _id: 'p' } as IProfile)
    useProfileStore.getState().markDisconnected('old')

    forgetAccount(queryClient)

    expect(queryClient.getQueryData(['get-user'])).toBeUndefined()
    expect(useProfileStore.getState().activeProfile).toBeNull()
    expect(useProfileStore.getState().recentlyDisconnected).toEqual({})
  })
})
