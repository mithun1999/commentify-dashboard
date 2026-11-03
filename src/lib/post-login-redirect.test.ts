import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isOnboardingPath,
  rememberPostLoginRedirect,
  takePostLoginRedirect,
} from './post-login-redirect'

/** A minimal in-memory `sessionStorage` for the node test environment. */
function fakeSessionStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
}

describe('post-login redirect', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeSessionStorage())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // A signed-out customer who opens the preview link from an email signs in
  // and must come back to the preview, not land on Agent Hub.
  it('returns a signed-out onboarding visit to its step once', () => {
    rememberPostLoginRedirect('/onboarding/preview')
    expect(takePostLoginRedirect()).toBe('/onboarding/preview')
    expect(takePostLoginRedirect()).toBeNull()
  })

  it('keeps the query string', () => {
    rememberPostLoginRedirect('/onboarding/preview?from=email')
    expect(takePostLoginRedirect()).toBe('/onboarding/preview?from=email')
  })

  it('ignores off-site targets', () => {
    rememberPostLoginRedirect('//evil.example/onboarding/preview')
    rememberPostLoginRedirect('https://evil.example/')
    expect(takePostLoginRedirect()).toBeNull()
  })
  // The onboarding layout's redirect effect runs again once the URL is
  // /sign-in; storing that would send the customer back to sign-in.
  it('treats only setup steps as onboarding paths', () => {
    expect(isOnboardingPath('/onboarding/preview')).toBe(true)
    expect(isOnboardingPath('/sign-in')).toBe(false)
    expect(isOnboardingPath('/onboardingx')).toBe(false)
  })
})
