const KEY = 'cmfy_appsumo_claim'

// The backend keeps a claim for 24 hours; stop offering it a little earlier.
const TTL_MS = 23 * 60 * 60 * 1000

/**
 * A license redeemed from AppSumo but not yet linked to an account.
 *
 * Kept in localStorage, not sessionStorage: a buyer who signs up may confirm
 * their email in a new tab, and that tab has to find the claim to finish.
 */
export interface PendingClaim {
  token: string
  tier?: number
  accounts?: number
  planTier?: string
  /** The code it came from, so a reload of the same link reuses it. */
  code?: string
  /**
   * The signed-in account (Supabase user id) the license could not be linked
   * to. The app stops sending that account back to /appsumo, so it can reach
   * Billing; another account still picks the claim up.
   */
  refusedFor?: string
  expiresAt: number
}

export function savePendingClaim(claim: Omit<PendingClaim, 'expiresAt'>) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...claim, expiresAt: Date.now() + TTL_MS })
    )
  } catch {
    // Private mode can refuse storage; the page still links in this tab.
  }
}

export function readPendingClaim(): PendingClaim | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const claim = JSON.parse(raw) as PendingClaim
    if (!claim?.token || !(claim.expiresAt > Date.now())) {
      localStorage.removeItem(KEY)
      return null
    }
    return claim
  } catch {
    return null
  }
}

/** Records that `userId` was refused, keeping the claim for another account. */
export function markClaimRefused(userId: string) {
  const claim = readPendingClaim()
  if (!claim) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...claim, refusedFor: userId }))
  } catch {
    // Without storage the redirect cannot be suppressed; nothing else to do.
  }
}

/** A claim waiting for this account (not one it was already refused). */
export function pendingClaimFor(userId?: string | null): PendingClaim | null {
  const claim = readPendingClaim()
  if (!claim || (userId && claim.refusedFor === userId)) return null
  return claim
}

export function clearPendingClaim() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
