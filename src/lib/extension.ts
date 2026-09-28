import { envConfig } from '@/config/env.config'
import type { IProfileResponseFromExtension } from '@/features/users/interface/profile.interface'

/**
 * Single boundary between the dashboard and the Commentify Chrome extension:
 * presence detection, extension-id resolution, and the message helpers
 * every connect/reconnect surface uses. Nothing else in the app should call
 * `chrome.runtime.sendMessage` directly.
 */

export type ExtensionState =
  | { status: 'checking' }
  | {
      status: 'ready'
      extensionId: string
      version?: string
      /**
       * True when the package answered the presence probe with its generic
       * unknown-message error rather than the handshake. That proves the
       * runtime is reachable and nothing more - do not assume newer
       * capabilities such as the platform-disconnect notice.
       */
      legacy: boolean
    }
  | {
      status: 'not-detected'
      reason: 'unreachable' | 'timeout'
      /**
       * The icon probe succeeded even though messaging did not: the package
       * is installed but the runtime cannot complete account operations
       * (disabled, mid-update, or an origin the package does not allow).
       * Worth a different hint than "install it".
       */
      installedButUnreachable?: boolean
    }
  | { status: 'unsupported-browser' }

export interface ExtensionDetectionResult {
  installed: boolean
  activeExtensionId: string | null
  state: ExtensionState
}

export type ProbeOutcome =
  | { ok: true; version?: string; legacy: boolean }
  | { ok: false; reason: 'unreachable' | 'timeout' }

export const GET_EXTENSION_INFO = 'get_extension_info'
export const DISCONNECT_PLATFORM_ACCOUNT = 'disconnect_platform_account'
const GET_PROFILE_DETAILS = 'get_profile_details'
const LINK_LI_ACCOUNT = 'link_linkedin_account'
const GET_TWITTER_PROFILE_DETAILS = 'get_twitter_profile_details'
const LINK_TWITTER_ACCOUNT = 'link_twitter_account'

/** Per-probe budget; a cold service worker usually answers well inside it. */
export const PROBE_TIMEOUT_MS = 2000
/** One bounded retry, and only for a timeout - a hard "no receiver" is final. */
export const PROBE_RETRIES = 1
/** Account operations do network work inside the extension; be generous. */
export const OPERATION_TIMEOUT_MS = 30_000

export interface ChromeRuntimeLike {
  id?: string
  lastError?: { message?: string } | undefined
  sendMessage?: (...args: unknown[]) => void
}

export class ExtensionUnavailableError extends Error {
  readonly state: ExtensionState

  constructor(state: ExtensionState, message?: string) {
    super(message ?? describeExtensionState(state))
    this.name = 'ExtensionUnavailableError'
    this.state = state
  }
}

export function describeExtensionState(state: ExtensionState): string {
  switch (state.status) {
    case 'unsupported-browser':
      return 'This browser cannot talk to the Commentify extension. Use Chrome, Brave or Edge.'
    case 'not-detected':
      return state.installedButUnreachable
        ? "The Commentify extension is installed but isn't responding. Check that it is enabled, then try again."
        : "We couldn't reach the Commentify extension."
    case 'checking':
      return 'Checking for the Commentify extension…'
    case 'ready':
      return 'Commentify extension detected.'
  }
}

export function getChromeRuntime(): ChromeRuntimeLike | undefined {
  if (typeof window === 'undefined') return undefined
  const chromeRef = (window as Window & { chrome?: { runtime?: ChromeRuntimeLike } })
    .chrome
  return chromeRef?.runtime
}

/**
 * A recognised handshake is the object our handler builds. An older package
 * answers any unknown type with `{ errorCode: 'unknown-message-type' }`,
 * which is a narrow, verified legacy presence signal. Anything else - an
 * arbitrary object, undefined, a string - is not a detection.
 */
export function classifyHandshakeResponse(response: unknown): ProbeOutcome {
  if (response && typeof response === 'object') {
    const body = response as Record<string, unknown>
    if (body.commentify === true) {
      return {
        ok: true,
        legacy: false,
        version: typeof body.version === 'string' ? body.version : undefined,
      }
    }
    if (body.errorCode === 'unknown-message-type') {
      return { ok: true, legacy: true }
    }
  }
  return { ok: false, reason: 'unreachable' }
}

/**
 * One probe of one candidate id. Registers the callback before sending,
 * settles exactly once (late replies after the timeout are ignored), and
 * reads `runtime.lastError` inside the callback as Chrome requires.
 */
export function probeExtensionOnce(
  extensionId: string,
  runtime: ChromeRuntimeLike,
  timeoutMs = PROBE_TIMEOUT_MS
): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (outcome: ProbeOutcome) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(outcome)
    }
    const timer = setTimeout(
      () => settle({ ok: false, reason: 'timeout' }),
      timeoutMs
    )
    try {
      runtime.sendMessage?.(
        extensionId,
        { type: GET_EXTENSION_INFO },
        (response: unknown) => {
          if (runtime.lastError) {
            settle({ ok: false, reason: 'unreachable' })
            return
          }
          settle(classifyHandshakeResponse(response))
        }
      )
    } catch {
      settle({ ok: false, reason: 'unreachable' })
    }
  })
}

async function probeWithRetry(
  extensionId: string,
  runtime: ChromeRuntimeLike,
  timeoutMs: number,
  retries: number
): Promise<ProbeOutcome> {
  let last: ProbeOutcome = { ok: false, reason: 'unreachable' }
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await probeExtensionOnce(extensionId, runtime, timeoutMs)
    if (last.ok) return last
    // "No receiving end" is Chrome telling us nothing is installed under
    // that id; only a silent timeout (cold worker) is worth a second try.
    if (last.reason !== 'timeout') return last
  }
  return last
}

/** Compatibility evidence only - never a detection by itself. */
function probeIcon(extensionId: string): Promise<boolean> {
  if (typeof Image === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS)
    image.onload = () => {
      clearTimeout(timer)
      resolve(true)
    }
    image.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    image.src = `chrome-extension://${extensionId}/${envConfig.chromeExtensionIconUrl}`
  })
}

let cachedExtensionId: string | null = null
let cachedState: ExtensionState = { status: 'checking' }
let inFlight: Promise<ExtensionDetectionResult> | null = null
// Bumped by every detection start and by invalidation, so a probe that was
// superseded can never write its (older) answer over a newer one.
let detectionSeq = 0

export interface DetectExtensionOptions {
  runtime?: ChromeRuntimeLike
  candidateIds?: string[]
  timeoutMs?: number
  retries?: number
  /** Skip the icon compatibility probe (tests). */
  withIconProbe?: boolean
}

function candidateIds(): string[] {
  const ids = [envConfig.chromeWebStoreExtensionId, envConfig.chromeExtensionId]
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
}

/**
 * Probes every supported extension id independently and concurrently, so a
 * hung candidate never blocks a responding one. Prefers a responding Web
 * Store install, then the manual install. Concurrent callers share one
 * in-flight detection; a superseded result is discarded.
 */
export function detectExtension(
  options: DetectExtensionOptions = {}
): Promise<ExtensionDetectionResult> {
  if (inFlight) return inFlight

  const seq = ++detectionSeq
  cachedState = { status: 'checking' }

  const run = async (): Promise<ExtensionDetectionResult> => {
    const runtime = options.runtime ?? getChromeRuntime()
    const ids = options.candidateIds ?? candidateIds()
    const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS
    const retries = options.retries ?? PROBE_RETRIES

    let state: ExtensionState
    let activeId: string | null = null

    if (!runtime || typeof runtime.sendMessage !== 'function') {
      state = { status: 'unsupported-browser' }
    } else {
      const outcomes = await Promise.all(
        ids.map((id) => probeWithRetry(id, runtime, timeoutMs, retries))
      )
      const readyIndex = outcomes.findIndex((outcome) => outcome.ok)
      if (readyIndex >= 0) {
        const outcome = outcomes[readyIndex] as Extract<ProbeOutcome, { ok: true }>
        activeId = ids[readyIndex]
        state = {
          status: 'ready',
          extensionId: activeId,
          version: outcome.version,
          legacy: outcome.legacy,
        }
      } else {
        const reason = outcomes.some((outcome) => !outcome.ok && outcome.reason === 'timeout')
          ? 'timeout'
          : 'unreachable'
        let installedButUnreachable = false
        if (options.withIconProbe ?? true) {
          const icons = await Promise.all(ids.map((id) => probeIcon(id)))
          installedButUnreachable = icons.some(Boolean)
        }
        state = { status: 'not-detected', reason, installedButUnreachable }
      }
    }

    if (seq === detectionSeq) {
      cachedExtensionId = activeId
      cachedState = state
    }
    return {
      installed: state.status === 'ready',
      activeExtensionId: activeId,
      state,
    }
  }

  inFlight = run().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Last known state without probing. */
export function getExtensionState(): ExtensionState {
  return cachedState
}

/**
 * The resolved id, or null until detection has succeeded. Never falls back to
 * the manual id silently: a message to an unresolved id is a guess, and a
 * guess that fails looks exactly like "not installed".
 */
export function getActiveExtensionId(): string | null {
  return cachedExtensionId
}

/** Forget the resolved id after a messaging failure so the next call reprobes. */
export function invalidateExtensionId() {
  detectionSeq++
  cachedExtensionId = null
  cachedState = { status: 'checking' }
}

async function requireExtensionId(): Promise<{
  extensionId: string
  runtime: ChromeRuntimeLike
}> {
  const runtime = getChromeRuntime()
  if (!runtime || typeof runtime.sendMessage !== 'function') {
    throw new ExtensionUnavailableError({ status: 'unsupported-browser' })
  }
  let extensionId = cachedExtensionId
  if (!extensionId) {
    const result = await detectExtension()
    extensionId = result.activeExtensionId
    if (!extensionId) throw new ExtensionUnavailableError(result.state)
  }
  return { extensionId, runtime }
}

/**
 * Sends one message to the resolved extension and resolves with its reply.
 * A runtime error invalidates the resolved id (the package may have been
 * disabled or updated) and surfaces as ExtensionUnavailableError so the
 * caller can offer a bounded recheck instead of spinning.
 */
export async function sendExtensionMessage<T>(
  message: { type: string } & Record<string, unknown>,
  timeoutMs = OPERATION_TIMEOUT_MS
): Promise<T> {
  const { extensionId, runtime } = await requireExtensionId()
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(
        new ExtensionUnavailableError(
          { status: 'not-detected', reason: 'timeout' },
          'The Commentify extension did not respond in time. Please try again.'
        )
      )
    }, timeoutMs)
    try {
      runtime.sendMessage?.(extensionId, message, (response: T) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (runtime.lastError) {
          invalidateExtensionId()
          reject(
            new ExtensionUnavailableError(
              { status: 'not-detected', reason: 'unreachable' },
              runtime.lastError.message
            )
          )
          return
        }
        resolve(response)
      })
    } catch (error) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      invalidateExtensionId()
      reject(
        new ExtensionUnavailableError(
          { status: 'not-detected', reason: 'unreachable' },
          error instanceof Error ? error.message : undefined
        )
      )
    }
  })
}

// ---------------------------------------------------------------------------
// Account operations. Each has side effects inside the extension (cookie
// reads, platform calls, backend writes) and must never be used as a
// presence check - that is what the handshake above is for.
// ---------------------------------------------------------------------------

export interface ITwitterProfileFromExtension {
  platform: 'twitter'
  authToken: string
  csrfToken: string
  /** Raw `chrome.cookies.Cookie` records, passed straight through to the API. */
  cookieDump: Record<string, unknown>[]
  queryIds?: Record<string, string>
  twitterUserId: string
  screenName: string
  displayName: string
  firstName: string
  lastName: string
  userAgent: string
  ja3Text?: string
}

export function getProfileDetailsFromExtension() {
  return sendExtensionMessage<IProfileResponseFromExtension>({
    type: GET_PROFILE_DETAILS,
  })
}

export function linkLinkedInProfileFromExtension() {
  return sendExtensionMessage<unknown>({ type: LINK_LI_ACCOUNT })
}

export function getTwitterProfileDetailsFromExtension() {
  return sendExtensionMessage<ITwitterProfileFromExtension>({
    type: GET_TWITTER_PROFILE_DETAILS,
  })
}

export function linkTwitterAccountFromExtension() {
  return sendExtensionMessage<unknown>({ type: LINK_TWITTER_ACCOUNT })
}

/**
 * Courtesy notice after a dashboard disconnect so the extension forgets the
 * account faster. Best effort: revocation already happened on the backend,
 * so an absent or older extension is not an error here.
 */
export async function notifyExtensionOfDisconnect(
  platform: 'linkedin' | 'twitter'
): Promise<boolean> {
  try {
    if (cachedState.status === 'ready' && cachedState.legacy) return false
    const response = await sendExtensionMessage<{ success?: boolean }>(
      { type: DISCONNECT_PLATFORM_ACCOUNT, platform },
      PROBE_TIMEOUT_MS
    )
    return response?.success === true
  } catch {
    return false
  }
}
