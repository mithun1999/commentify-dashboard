import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth.store'
import { useOnboardingStore } from './onboarding.store'

const onboarding = () => useOnboardingStore.getState()
const sessionFor = (id: string) => ({ user: { id } }) as Session

const pickAnswers = () => {
  onboarding().updateData({
    selectedCapabilities: ['comment', 'post'],
    selectedAgentMode: 'sales',
  })
  onboarding().markStepCompleted('extension')
}

beforeEach(() => {
  onboarding().resetData()
  useOnboardingStore.setState({ ownerId: null })
})

describe('claimFor', () => {
  it('keeps the answers when the same account comes back', () => {
    onboarding().claimFor('a')
    pickAnswers()
    onboarding().claimFor('a')
    expect(onboarding().data.selectedCapabilities).toEqual(['comment', 'post'])
    expect(onboarding().completedSteps).toEqual(['extension'])
  })

  it('clears them when a different account signs in', () => {
    onboarding().claimFor('a')
    pickAnswers()
    onboarding().claimFor('b')
    expect(onboarding().data.selectedCapabilities).toEqual([])
    expect(onboarding().data.selectedAgentMode).toBeNull()
    expect(onboarding().completedSteps).toEqual([])
    expect(onboarding().ownerId).toBe('b')
  })

  it('keeps answers saved before owners were tracked', () => {
    pickAnswers()
    onboarding().claimFor('a')
    expect(onboarding().data.selectedCapabilities).toEqual(['comment', 'post'])
    expect(onboarding().ownerId).toBe('a')
  })
})

describe('setSession', () => {
  it('claims the answers for whoever signs in', () => {
    useAuthStore.getState().setSession(sessionFor('a'))
    pickAnswers()
    useAuthStore.getState().setSession(sessionFor('b'))
    expect(onboarding().data.selectedCapabilities).toEqual([])
    expect(onboarding().ownerId).toBe('b')
  })

  // A sign-out is not a new person: a session that expires mid-setup comes
  // back as the same account and needs its picks.
  it('leaves them alone on sign-out', () => {
    useAuthStore.getState().setSession(sessionFor('a'))
    pickAnswers()
    useAuthStore.getState().setSession(null)
    useAuthStore.getState().setSession(sessionFor('a'))
    expect(onboarding().data.selectedCapabilities).toEqual(['comment', 'post'])
  })
})
