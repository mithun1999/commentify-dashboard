/**
 * Shared, framework-light helpers for Workstream A (connection recovery).
 *
 * These are intentionally pure/dependency-light so they can be unit tested
 * without mounting React or a real QueryClient. Two call sites use this
 * module:
 *
 * - `main.tsx`'s `QueryCache.onError`: decide whether a failed query needs
 *   the small default toast+retry notice, or whether it opted out because a
 *   component renders its own error state (see `shouldSuppressGlobalErrorNotice`).
 * - `features/users/query/profile.query.ts`: classify a failed link mutation
 *   as "definitely failed" vs "ambiguous" (timeout/5xx, where the write may
 *   have actually persisted), and classify the profile list query's
 *   loading/error/empty/ready UI state.
 */
import { AxiosError } from 'axios'
import type {
  IProfile,
  IProfileIdentity,
} from '@/features/users/interface/profile.interface'

// ---------------------------------------------------------------------------
// Global query-error notice (main.tsx)
// ---------------------------------------------------------------------------

/**
 * Opt a query out of the default global error toast. Set via
 * `useQuery({ meta: { suppressGlobalErrorToast: true } })` on queries whose
 * component renders its own error/retry UI, so the user does not see two
 * conflicting notices for one failure.
 */
export function shouldSuppressGlobalErrorNotice(
  query: { meta?: Record<string, unknown> | undefined }
): boolean {
  return query.meta?.suppressGlobalErrorToast === true
}

export function getAxiosStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

/** The dashboard's existing session-expiry policy: unchanged by this workstream. */
export function isSessionExpiredError(error: unknown): boolean {
  return getAxiosStatus(error) === 401
}

export function getReadableErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { title?: string; message?: string }
      | undefined
    return data?.title || data?.message || error.message || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * Stable id so sonner updates one toast per query instead of stacking a new
 * one on every failed retry/background refetch of the same query.
 */
export function buildQueryErrorToastId(queryKey: readonly unknown[]): string {
  return `query-error:${JSON.stringify(queryKey)}`
}

/** True when the query still has data from a previous successful fetch. React Query keeps `data` on a failed refetch; only `status`/`error` change. */
export function queryHasCachedData(query: {
  state: { data?: unknown }
}): boolean {
  return query.state.data !== undefined
}

/** The backend's stable machine-readable code, when the error body has one. */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof AxiosError)) return undefined
  const code = (error.response?.data as { code?: unknown } | undefined)?.code
  return typeof code === 'string' ? code : undefined
}

export const PROFILE_RECONNECT_REQUIRED = 'PROFILE_RECONNECT_REQUIRED'
export const PROFILE_CLEANUP_PENDING = 'PROFILE_CLEANUP_PENDING'

/**
 * The backend refused to restore a deliberately disconnected account because
 * the request carried no explicit reconnect intent. Callers show the
 * confirmation and, only if the owner agrees, send the link again with
 * `reconnect: true`.
 */
export class ProfileReconnectRequiredError extends Error {
  readonly profile: IProfileIdentity

  constructor(profile: IProfileIdentity, message?: string) {
    super(message ?? 'This account was disconnected. Reconnect it to continue.')
    this.name = 'ProfileReconnectRequiredError'
    this.profile = profile
  }
}

export function toReconnectRequiredError(
  error: unknown
): ProfileReconnectRequiredError | null {
  if (getApiErrorCode(error) !== PROFILE_RECONNECT_REQUIRED) return null
  const data = (error as AxiosError).response?.data as
    | { message?: string; profile?: IProfileIdentity }
    | undefined
  return new ProfileReconnectRequiredError(data?.profile ?? {}, data?.message)
}

/**
 * Owner-scoped reconciliation after an ambiguous link result: the expected
 * platform identity, present in the *current* list (the backend never lists
 * disconnected rows) and in a connected state. An older record in any other
 * state is not proof that the write landed.
 */
export function findExpectedProfile(
  profiles: IProfile[] | undefined,
  expected: { profileUrn?: string; twitterUserId?: string }
): IProfile | undefined {
  if (!Array.isArray(profiles)) return undefined
  return profiles.find((profile) => {
    if (profile.status !== 'ok') return false
    if (expected.twitterUserId) {
      return profile.twitterUserId === expected.twitterUserId
    }
    if (expected.profileUrn) return profile.profileUrn === expected.profileUrn
    return false
  })
}

// ---------------------------------------------------------------------------
// Profile list UI state (routes/_authenticated/route.tsx)
// ---------------------------------------------------------------------------

export type ProfileListUIState = 'loading' | 'load-error' | 'empty' | 'ready'

/**
 * Distinguishes "no accounts connected" from "we don't know yet" and from
 * "we knew, and can't currently confirm the refresh." Only a successful
 * response with zero profiles produces `empty`. Any state with cached data
 * (even a cached empty list) reports `ready`/`empty` independent of a
 * concurrent background error, so a background refresh failure never blanks
 * or replaces previously loaded content — the caller can still inspect
 * `isError` separately to show a scoped warning.
 */
export function classifyProfileListState(args: {
  isLoading: boolean
  isError: boolean
  isFetched: boolean
  data: unknown[] | undefined
}): ProfileListUIState {
  const { isLoading, isError, isFetched, data } = args
  const hasData = Array.isArray(data)

  if (hasData) {
    return data.length === 0 ? 'empty' : 'ready'
  }
  if (isError) return 'load-error'
  if (isLoading || !isFetched) return 'loading'
  // Fetched successfully but the response was not array-shaped: fail open
  // rather than trap the user behind a permanent error/empty state.
  return 'ready'
}

// ---------------------------------------------------------------------------
// Link-mutation ambiguity + reconciliation (features/users/query/profile.query.ts)
// ---------------------------------------------------------------------------

/**
 * A write whose outcome is unknown: the request timed out, the connection
 * dropped, or the server returned 5xx after (maybe) committing the write.
 * Contrasted with a definitive 4xx validation failure, where the write is
 * known not to have happened and no reconciliation read is warranted.
 */
export function isAmbiguousMutationFailure(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return true
  const status = error.response?.status
  if (status === undefined) return true
  return status >= 500
}

/**
 * Thrown when a link mutation's outcome could not be confirmed by
 * re-reading profile state. Distinct from a definitive failure so callers
 * can show "check again" instead of a hard "connection failed" error, and
 * so they never retry the write itself.
 */
export class LinkConfirmationUncertainError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super("We couldn't confirm the connection. Check again.")
    this.name = 'LinkConfirmationUncertainError'
    this.cause = cause
  }
}
