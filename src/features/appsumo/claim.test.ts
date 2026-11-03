import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingClaim,
  markClaimRefused,
  pendingClaimFor,
  readPendingClaim,
  savePendingClaim,
} from './claim'

describe('pending AppSumo claim', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps a claim for a new tab to finish', () => {
    savePendingClaim({ token: 't', tier: 3, accounts: 6, code: 'c' })
    expect(readPendingClaim()).toMatchObject({ token: 't', tier: 3, code: 'c' })
    clearPendingClaim()
    expect(readPendingClaim()).toBeNull()
  })

  it('stops offering a claim to the account it was refused for', () => {
    savePendingClaim({ token: 't' })
    expect(pendingClaimFor('user-a')).not.toBeNull()

    markClaimRefused('user-a')
    expect(pendingClaimFor('user-a')).toBeNull()
    // Kept for whoever signs in next.
    expect(pendingClaimFor('user-b')).toMatchObject({ token: 't' })
    expect(readPendingClaim()).toMatchObject({ refusedFor: 'user-a' })
  })

  it('forgets a claim before the backend does', () => {
    vi.useFakeTimers()
    savePendingClaim({ token: 't' })
    vi.advanceTimersByTime(23 * 60 * 60 * 1000 + 1)
    expect(readPendingClaim()).toBeNull()
  })
})
