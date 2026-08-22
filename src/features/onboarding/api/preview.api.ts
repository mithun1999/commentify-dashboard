import { envConfig } from '@/config/env.config'
import { axiosInstance } from '@/utils/axios.util'
import { getAuthToken } from '@/features/auth/utils/auth.util'

export type PostRejectionReason =
  | 'empty-content'
  | 'blacklisted'
  | 'company-author'
  | 'hiring-post'
  | 'job-change-post'
  | 'link-share'
  | 'low-engagement'
  | 'out-of-region'
  | 'off-topic'
  | 'wrong-language'
  | 'promotional'
  | 'no-buying-signal'
  | 'judge-error'

export const REJECTION_COPY: Record<PostRejectionReason, string> = {
  'empty-content': 'No text worth replying to',
  blacklisted: 'Blocked author or spam keyword',
  'company-author': 'Posted by a company page',
  'hiring-post': 'Job ad',
  'job-change-post': 'New-role announcement',
  'link-share': 'Link share with no commentary',
  'low-engagement': 'Too quiet to be worth a comment',
  'out-of-region': 'Author outside the regions you target',
  'off-topic': 'Not about your topics',
  'wrong-language': 'Wrong language',
  promotional: 'Promotional, not a discussion',
  'no-buying-signal': 'No buying signal',
  'judge-error': 'Could not read this one',
}

export interface PreviewFeedEvent {
  stage: 'judged' | 'commented'
  activityUrn: string
  kept: boolean
  reason?: PostRejectionReason
  authorName?: string
  authorHeadline?: string
  excerpt?: string
  comment?: string
  keyword?: string
}

export interface PreviewKeywordEvent {
  /**
   * `fetched` fires per page of results, before any of them are judged.
   * `retrying` is the run itself rather than a keyword: an attempt failed on
   * something transient and the queue is about to start the whole scrape over.
   */
  status: 'started' | 'fetched' | 'completed' | 'retrying'
  keyword?: string
  postsFound?: number
  /** `retrying` only: which attempt just failed, and how many there are. */
  attempt?: number
  attempts?: number
}

/**
 * Where the job is before it has a keyword to report - queued behind other
 * signups, or picked up and starting. Without these the screen has nothing to
 * say between opening the stream and the first search coming back.
 */
export interface PreviewRunStatusEvent {
  status: string
  /** Position in the queue, when it is waiting behind other runs. */
  queue?: number
}

export interface PreviewStreamHandlers {
  onOpen?: () => void
  onRunStatus?: (event: PreviewRunStatusEvent) => void
  onKeyword?: (event: PreviewKeywordEvent) => void
  onFeed?: (event: PreviewFeedEvent) => void
  onDone?: (info: { failed: boolean; message?: string }) => void
  onError?: (error: Error) => void
}

export interface PreviewDraft {
  activityUrn: string
  postUrl?: string
  content: string
  authorName?: string
  authorHeadline?: string
  authorProfileUrl?: string
  authorImage?: string
  numLikes?: number
  numComments?: number
  comment: string
  createdAt?: string
}

export interface PreviewCaps {
  runsUsed: number
  runsAllowed: number
  published: number
  publishAllowed: number
  capped: boolean
}

/**
 * What the last scrape did. An empty screen means one of two very different
 * things - the agent read the feed and passed on everything, or it never
 * reached LinkedIn - and only the second one is our fault to admit.
 */
export interface PreviewLastRun {
  status: string
  postsFetched: number
  postsAnalyzed: number
  searchFailed: boolean
  ranAt: string | null
}

export interface PreviewResults {
  profileId: string
  drafts: PreviewDraft[]
  lastRun: PreviewLastRun | null
  /** What the agent was actually configured to look for, per the saved setting. */
  agentMode: 'sales' | 'branding'
  /** The LinkedIn session expired; no amount of retrying will help. */
  needsReconnect: boolean
  caps: PreviewCaps
  remainingPublishes: number
}

/**
 * Native `EventSource` cannot set an Authorization header, and the preview
 * stream is the thing that spends LinkedIn searches on our admin tokens - so it
 * is read over `fetch` instead, which can.
 *
 * Nest's `@Sse()` can surface a thrown Forbidden as either an HTTP 403 JSON
 * body or a 200 event-stream that contains the error payload then closes.
 * Both have to settle the UI; a stream that ends with no `job_status` must
 * not leave the feed spinning.
 */
export function openPreviewStream(
  profileId: string,
  handlers: PreviewStreamHandlers
): () => void {
  const controller = new AbortController()
  let settled = false

  const fail = (error: Error) => {
    if (settled) return
    settled = true
    handlers.onError?.(error)
  }

  const finish = (info: { failed: boolean; message?: string }) => {
    if (settled) return
    settled = true
    handlers.onDone?.(info)
  }

  const run = async () => {
    const response = await fetch(
      `${envConfig.apiUrl}/onboarding-preview/${profileId}/stream`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      }
    )

    if (!response.ok || !response.body) {
      throw new Error(await readErrorMessage(response))
    }

    handlers.onOpen?.()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by a blank line; anything before the last one
      // is complete, whatever remains is a partial frame for the next read.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const message = parseFrame(frame)
        if (!message) continue

        const streamError = errorFromStreamMessage(message)
        if (streamError) {
          fail(streamError)
          controller.abort()
          return
        }
        dispatch(message, {
          ...handlers,
          onDone: finish,
          onError: fail,
        })
      }
    }

    finish({ failed: false })
  }

  run().catch((error: unknown) => {
    if ((error as { name?: string })?.name === 'AbortError') return
    fail(error instanceof Error ? error : new Error(String(error)))
  })

  return () => controller.abort()
}

interface StreamMessage {
  type?: string
  message?: string | string[]
  error?: string
  statusCode?: number
  data?: Record<string, unknown>
}

/**
 * Reassembles one SSE frame into the shape the backend meant to send.
 *
 * Nest does not put our envelope on the wire. `SseStream._transform` lifts
 * `type` onto the `event:` line, writes only `data` as the body, and drops
 * every other key - so `{ type: 'post_feed', data: {...} }` arrives as an
 * `event:` header plus the bare payload. Reading the body alone, as this used
 * to, leaves every message with no `type` at all, which is why not one of
 * them ever matched a branch in `dispatch` and the feed sat silent through
 * runs the server had narrated in full.
 */
function parseFrame(frame: string): StreamMessage | null {
  let event = ''
  const body: string[] = []

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) body.push(line.slice(5).trim())
  }

  // A payload containing newlines is written as one `data:` line each, so the
  // newlines have to go back in to get valid JSON out.
  const payload = body.join('\n')
  if (!payload) return null

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>
    // No `event:` means a body Nest wrote itself rather than one of ours - an
    // error payload, which carries its own shape.
    return event ? { type: event, data: parsed } : (parsed as StreamMessage)
  } catch {
    return null
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = 'We could not start your preview.'
  try {
    const body = await response.json()
    if (Array.isArray(body?.message)) return body.message.join(', ') || fallback
    if (typeof body?.message === 'string' && body.message) return body.message
  } catch {
    // Non-JSON error body; the default message stands.
  }
  return fallback
}

function errorFromStreamMessage(message: StreamMessage): Error | null {
  const data = (message?.data ?? message) as StreamMessage
  const status = data.statusCode ?? message.statusCode
  const raw = data.message ?? message.message ?? data.error ?? message.error
  const text = Array.isArray(raw) ? raw.join(', ') : (raw ?? '')
  if (status && status >= 400) {
    return new Error(text || 'The search did not finish.')
  }
  if (/already run/i.test(text)) return new Error(text)
  return null
}

function dispatch(message: StreamMessage, handlers: PreviewStreamHandlers) {
  const data = message?.data ?? {}

  if (message?.type === 'scrape_progress') {
    handlers.onKeyword?.(data as unknown as PreviewKeywordEvent)
    return
  }

  if (message?.type === 'post_feed') {
    handlers.onFeed?.(data as unknown as PreviewFeedEvent)
    return
  }

  if (message?.type === 'job_status') {
    if (data.status === 'completed') {
      handlers.onDone?.({ failed: false })
      return
    }
    if (data.status === 'failed') {
      handlers.onDone?.({ failed: true, message: String(data.error ?? '') })
      return
    }
    handlers.onRunStatus?.({
      status: String(data.status ?? ''),
      queue: typeof data.queue === 'number' ? data.queue : undefined,
    })
  }
}

export async function getPreviewResults(
  profileId: string
): Promise<PreviewResults> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/onboarding-preview/${profileId}`,
  })
  return data
}

export async function publishPreviewComments(payload: {
  profileId: string
  activityUrns: string[]
}): Promise<{
  publishedCount: number
  remainingPublishes: number
  results: { activityUrn: string; published: boolean; error?: string }[]
}> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/onboarding-preview/${payload.profileId}/publish`,
    data: { activityUrns: payload.activityUrns },
  })
  return data
}

/** Mirrors `PreviewStage` on the backend; see preview-progress.service.ts. */
export type PostingStage =
  | 'reading_posts'
  | 'learning_voice'
  | 'choosing_idea'
  | 'queued'
  | 'researching'
  | 'planning'
  | 'writing'
  | 'revising'
  | 'reviewing'
  | 'drawing_image'
  | 'done'

export interface PostingProgress {
  stage: PostingStage
  at: string
  startedAt: string
  steps: { stage: PostingStage; at: string }[]
}

export interface PostingPreview {
  phase: 'voice' | 'drafting' | 'ready' | 'failed' | 'none'
  /** Absent on a preview started before this shipped, or once the TTL lapses. */
  progress?: PostingProgress | null
  voiceReady: boolean
  failureReason?: string | null
  postsAnalyzed: number | null
  toneDescription: string | null
  contentPillars: string[]
  post: {
    id: string
    calendarId?: string
    content: string
    status: string
    outputType?: string
    isCarousel: boolean
    media: {
      type: 'image' | 'pdf'
      url: string
      aiKind?: string
      slideIndex?: number
    }[]
    generationWarning: string | null
  } | null
}

export async function prewarmPostingPreview(payload: {
  profileId: string
  carouselTeaser?: boolean
  /** Replace an attempt that never produced a draft, rather than read it back. */
  regenerate?: boolean
}): Promise<{ taskId: string }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/onboarding/preview/prewarm',
    data: payload,
  })
  return data
}

export async function getPostingPreview(
  profileId: string
): Promise<PostingPreview> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/onboarding/preview/${profileId}`,
  })
  return data
}
