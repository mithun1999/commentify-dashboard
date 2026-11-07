import type { PostingPreview } from '../api/preview.api'

/**
 * Fast enough that a stage change is on screen within a couple of seconds of
 * the worker announcing it. The endpoint is two indexed reads and a Redis get,
 * and this only runs while an onboarding preview is in flight.
 */
export const POLL_MS = 2500

/**
 * A healthy preview has landed well before this. Past it the screen says so
 * and points at the way forward, which has been open the whole time. This is
 * not a failure: only the backend calls that, from the state of the jobs.
 */
export const SLOW_AFTER_MS = 90 * 1000

/** When to read again, or false once there is nothing left to wait for. */
export function nextPoll(preview: PostingPreview | undefined): number | false {
  if (preview?.phase === 'failed') return false
  // Stopping the moment the text is written is what left an illustrated format
  // showing no illustration until the user reloaded the page.
  if (preview?.phase === 'ready') return preview.imagePending ? POLL_MS : false
  return POLL_MS
}

/** How long until the wait counts as slow; 0 once it does. */
export function msUntilSlow(startedAt: number, now: number): number {
  return Math.max(0, SLOW_AFTER_MS - (now - startedAt))
}

/**
 * A written draft outranks every failure state, since telling someone their
 * post "did not finish" above the post itself reads as a bug. `startFailed` is
 * the request to begin never landing: no job exists, so the backend has nothing
 * to report, and a post appearing means it landed after all.
 */
export function showsFailure(
  preview: PostingPreview | undefined,
  startFailed: boolean
): boolean {
  if (preview?.post?.content) return false
  return preview?.phase === 'failed' || (startFailed && !preview?.post)
}
