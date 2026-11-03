import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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
})
