import { useCallback, useEffect, useState } from 'react'
import {
  getPreviewResults,
  openPreviewStream,
  type PreviewDraft,
  type PreviewFeedEvent,
  type PreviewResults,
} from '../api/preview.api'
import { awaitSettingsSaved } from './useDeriveOnboardingSettings'

export interface FeedRow {
  id: string
  authorName?: string
  authorHeadline?: string
  excerpt?: string
  keyword?: string
  kept: boolean
  reason?: PreviewFeedEvent['reason']
  comment?: string
}

/**
 * A line about the run itself rather than about a post - which keyword it is
 * on, how many results came back. The gap between asking LinkedIn and the
 * first verdict is tens of seconds of real work with nothing to show for it,
 * and these are what fill it.
 */
export interface FeedNote {
  id: string
  kind: 'queued' | 'starting' | 'retrying' | 'searching' | 'found'
  keyword?: string
  /** Results for `found`, queue position for `queued`. */
  count?: number
  /** `retrying` only. */
  attempt?: number
  attempts?: number
  at: number
}

export type PreviewPhase = 'idle' | 'preparing' | 'searching' | 'done' | 'failed'

/** How much of the feed stays on screen. Older rows scroll out of memory too. */
const MAX_ROWS = 40
const MAX_NOTES = 12

interface PreviewSnapshot {
  started: boolean
  live: boolean
  phase: PreviewPhase
  rows: FeedRow[]
  notes: FeedNote[]
  /** Posts LinkedIn returned, across every search so far. */
  scraped: number
  /** Posts the agent has reached a verdict on. Trails `scraped` while judging. */
  analysed: number
  keyword: string | null
  keywordsSeen: string[]
  results: PreviewResults | null
  error: string | null
}

const EMPTY: PreviewSnapshot = {
  started: false,
  live: false,
  phase: 'idle',
  rows: [],
  notes: [],
  scraped: 0,
  analysed: 0,
  keyword: null,
  keywordsSeen: [],
  results: null,
  error: null,
}

const snapshots = new Map<string, PreviewSnapshot>()
const listeners = new Map<string, Set<() => void>>()
const closers = new Map<string, () => void>()
const begins = new Set<string>()

/**
 * Which posts have already been counted as read.
 *
 * Kept apart from `rows`, which is capped and drops its oldest: a run longer
 * than the cap would recount a post whose row had scrolled out of memory, and
 * the totals are the one thing on screen that must not go backwards. A kept
 * post also arrives twice - once with its verdict, once with its comment - and
 * this is what stops the second arrival counting again.
 */
const judged = new Map<string, Set<string>>()

function snapshotOf(profileId: string): PreviewSnapshot {
  const existing = snapshots.get(profileId)
  if (existing) return existing
  const created: PreviewSnapshot = {
    ...EMPTY,
    rows: [],
    notes: [],
    keywordsSeen: [],
  }
  snapshots.set(profileId, created)
  return created
}

function judgedOf(profileId: string): Set<string> {
  const existing = judged.get(profileId)
  if (existing) return existing
  const created = new Set<string>()
  judged.set(profileId, created)
  return created
}

function addNote(profileId: string, note: Omit<FeedNote, 'id' | 'at'>) {
  const snap = snapshotOf(profileId)
  const at = Date.now()
  patch(profileId, {
    notes: [
      { ...note, id: `${note.kind}-${note.keyword ?? ''}-${at}`, at },
      ...snap.notes,
    ].slice(0, MAX_NOTES),
  })
}

/**
 * The job announces itself as active from two places, and again from the top
 * on a retry. Repeating "Starting the search" for each is noise; saying it
 * again after a retry has intervened is the point.
 */
function addNoteOnce(profileId: string, note: Omit<FeedNote, 'id' | 'at'>) {
  if (snapshotOf(profileId).notes[0]?.kind === note.kind) return
  addNote(profileId, note)
}

function notify(profileId: string) {
  listeners.get(profileId)?.forEach((fn) => fn())
}

function patch(profileId: string, update: Partial<PreviewSnapshot>) {
  Object.assign(snapshotOf(profileId), update)
  notify(profileId)
}

/**
 * Drives one onboarding preview run: opens the stream, accumulates the live
 * decision feed, and loads the finished drafts when the scrape ends.
 *
 * State lives at module scope so going Back and returning does not spend a
 * second free run or wipe the feed. The scrape keeps running after unmount.
 */
export function usePreviewRun(profileId: string | undefined) {
  const [, rerender] = useState(0)

  useEffect(() => {
    if (!profileId) return
    const onChange = () => rerender((n) => n + 1)
    let set = listeners.get(profileId)
    if (!set) {
      set = new Set()
      listeners.set(profileId, set)
    }
    set.add(onChange)
    return () => {
      set.delete(onChange)
    }
  }, [profileId])

  const loadResults = useCallback(async () => {
    if (!profileId) return
    try {
      patch(profileId, { results: await getPreviewResults(profileId) })
    } catch {
      patch(profileId, { results: null })
    }
  }, [profileId])

  const start = useCallback(() => {
    if (!profileId) return
    const current = snapshotOf(profileId)
    if (current.phase === 'done' || current.phase === 'failed') return
    if (current.live || begins.has(profileId)) return
    beginRun(profileId, loadResults)
  }, [profileId, loadResults])

  /** Explicit user retry, which is allowed to restart a run that failed. */
  const retry = useCallback(() => {
    if (!profileId) return
    const current = snapshotOf(profileId)
    if (current.live || begins.has(profileId)) return
    judgedOf(profileId).clear()
    patch(profileId, {
      rows: [],
      notes: [],
      scraped: 0,
      analysed: 0,
      keyword: null,
      keywordsSeen: [],
    })
    beginRun(profileId, loadResults, true)
  }, [profileId, loadResults])

  const snap = profileId ? snapshotOf(profileId) : EMPTY
  const kept = snap.rows.filter((r) => r.kept)
  const rejected = snap.rows.filter((r) => !r.kept)

  return {
    phase: snap.phase,
    rows: snap.rows,
    notes: snap.notes,
    scrapedCount: snap.scraped,
    analysedCount: snap.analysed,
    keptCount: kept.length,
    rejectedCount: rejected.length,
    keyword: snap.keyword,
    keywordsSeen: snap.keywordsSeen,
    drafts: snap.results?.drafts ?? ([] as PreviewDraft[]),
    lastRun: snap.results?.lastRun ?? null,
    agentMode: snap.results?.agentMode ?? null,
    needsReconnect: snap.results?.needsReconnect ?? false,
    remainingPublishes: snap.results?.remainingPublishes ?? 0,
    caps: snap.results?.caps ?? null,
    error: snap.error,
    canRetry: retryable(snap.results),
    start,
    retry,
    reloadResults: loadResults,
  }
}

/**
 * Mirrors the cap the preview endpoint enforces. A free account gets one run,
 * and the backend hands it back when the scrape never reached LinkedIn - so a
 * failed search is retryable at the cap and a successful one is not. Offering
 * a button the server will refuse is worse than offering none.
 */
function retryable(results: PreviewResults | null): boolean {
  if (!results) return true
  if (results.lastRun?.searchFailed) return true
  // Paid accounts report -1 for "no cap": Infinity does not survive JSON.
  if (results.caps.runsAllowed < 0) return true
  return results.caps.runsUsed < results.caps.runsAllowed
}

/**
 * `force` is an explicit retry rather than the screen mounting. Without it a
 * finished run is replayed from storage instead of re-scraped, which is right
 * for a revisit and wrong for a button press: the user asking for another
 * search would watch the same empty result reappear with nothing having run.
 */
function beginRun(
  profileId: string,
  loadResults: () => Promise<void>,
  force = false
) {
  begins.add(profileId)
  patch(profileId, { started: true, phase: 'preparing', error: null })

  void (async () => {
    try {
      // Targeting is written by the connect step without being waited on, and
      // the scrape reads it from the database - so starting before it lands
      // would search on keywords that do not exist yet.
      try {
        await awaitSettingsSaved(profileId)
      } catch (error) {
        patch(profileId, {
          live: false,
          phase: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'We could not finish setting up your agent.',
        })
        return
      }

      patch(profileId, { phase: 'searching' })

      try {
        const existing = await getPreviewResults(profileId)
        // A run that never reached LinkedIn is not a finished run. Reporting
        // it as done is what turns an outage into "nothing was worth your
        // name" - the one message the screen must never show by mistake.
        if (
          !force &&
          existing.caps.runsUsed > 0 &&
          !existing.lastRun?.searchFailed
        ) {
          patch(profileId, { results: existing, live: false, phase: 'done' })
          return
        }
        patch(profileId, { results: existing })
      } catch {
        // A results fetch failing should not skip the live run.
      }

      if (closers.has(profileId)) return
      if (snapshotOf(profileId).phase === 'done') return

      const close = openPreviewStream(profileId, {
        onOpen: () => patch(profileId, { live: true }),
        onRunStatus: ({ status, queue }) => {
          if (status === 'waiting' && queue && queue > 1) {
            addNoteOnce(profileId, { kind: 'queued', count: queue })
            return
          }
          if (status === 'active' || status === 'started') {
            addNoteOnce(profileId, { kind: 'starting' })
          }
        },
        onKeyword: (event) => {
          if (event.status === 'retrying') {
            // A retry starts the whole scrape again, so the totals from the
            // attempt that died would otherwise be added to the new one's.
            judgedOf(profileId).clear()
            addNote(profileId, {
              kind: 'retrying',
              attempt: event.attempt,
              attempts: event.attempts,
            })
            patch(profileId, { scraped: 0, analysed: 0, keyword: null })
            return
          }
          if (event.status === 'fetched') {
            addNote(profileId, {
              kind: 'found',
              keyword: event.keyword,
              count: event.postsFound ?? 0,
            })
            patch(profileId, {
              scraped:
                snapshotOf(profileId).scraped + (event.postsFound ?? 0),
            })
            return
          }
          // `completed` carries the run's running total rather than this
          // keyword's, so there is nothing truthful to say per keyword from it.
          if (event.status !== 'started') return

          const snap = snapshotOf(profileId)
          addNote(profileId, { kind: 'searching', keyword: event.keyword })
          patch(profileId, {
            keyword: event.keyword ?? null,
            keywordsSeen:
              !event.keyword || snap.keywordsSeen.includes(event.keyword)
                ? snap.keywordsSeen
                : [...snap.keywordsSeen, event.keyword],
          })
        },
        onFeed: (event) => {
          const snap = snapshotOf(profileId)
          const seen = judgedOf(profileId)
          const firstVerdict = !seen.has(event.activityUrn)
          if (firstVerdict) seen.add(event.activityUrn)

          const existing = snap.rows.findIndex(
            (r) => r.id === event.activityUrn
          )

          // The same post arrives twice when it is kept: once at judgement and
          // again with its comment. The second event fills the first row in
          // rather than adding a duplicate.
          if (existing >= 0) {
            const next = [...snap.rows]
            next[existing] = { ...next[existing], ...toRow(event) }
            patch(profileId, { rows: next })
            return
          }
          patch(profileId, {
            rows: [toRow(event), ...snap.rows].slice(0, MAX_ROWS),
            analysed: snap.analysed + (firstVerdict ? 1 : 0),
          })
        },
        onDone: ({ failed, message }) => {
          closers.delete(profileId)
          // Leaving the phase alone until the results are in hand: it is what
          // swaps the live feed out for the drafts, and flipping it first
          // opens a gap the length of a fetch where the run is over and the
          // drafts have not landed - which renders as "nothing was worth
          // commenting on" over a run that found plenty.
          void loadResults().finally(() =>
            patch(
              profileId,
              failed
                ? {
                    live: false,
                    phase: 'failed',
                    error: message || 'The search did not finish.',
                  }
                : { live: false, phase: 'done' }
            )
          )
        },
        onError: (err) => {
          closers.delete(profileId)
          if (alreadyUsed(err)) {
            void loadResults().finally(() =>
              patch(profileId, { live: false, phase: 'done', error: null })
            )
            return
          }
          patch(profileId, {
            live: false,
            error: err.message,
            phase: 'failed',
          })
        },
      })
      closers.set(profileId, close)
    } finally {
      begins.delete(profileId)
    }
  })()
}

function alreadyUsed(err: Error) {
  return /already run/i.test(err.message)
}

function toRow(event: PreviewFeedEvent): FeedRow {
  return {
    id: event.activityUrn,
    authorName: event.authorName,
    authorHeadline: event.authorHeadline,
    excerpt: event.excerpt,
    keyword: event.keyword,
    kept: event.kept,
    reason: event.reason,
    comment: event.comment,
  }
}
