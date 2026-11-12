import type { CaptureResult, PostHogConfig } from 'posthog-js'

// Supabase's Google OAuth redirect lands on
// app.commentify.co/#access_token=…&refresh_token=…&provider_token=…
// and PostHog would otherwise record that full URL in $current_url,
// $referrer, $initial_current_url, exception frames, etc.
const SENSITIVE_PARAMS = [
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'code',
]

// Catches the params wherever they appear in a string that isn't a clean URL
// (exception messages, stack frames, concatenated text).
const SENSITIVE_PARAM_PATTERN = new RegExp(
  `([?#&](?:${SENSITIVE_PARAMS.join('|')})=)[^&#\\s"'<>]*`,
  'g'
)

// Session replay payloads are large and are not URL properties; walking them
// on every snapshot would be wasted work.
const SKIPPED_EVENTS = new Set(['$snapshot'])

export function sanitizeUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      url.hash = ''
      for (const param of SENSITIVE_PARAMS) url.searchParams.delete(param)
      return url.toString()
    } catch {
      // Not a parseable URL after all; fall through to the pattern scrub.
    }
  }
  return value.replace(SENSITIVE_PARAM_PATTERN, '$1[redacted]')
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return sanitizeUrl(value)
  if (depth > 8 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    out[key] = sanitizeValue(v, depth + 1)
  }
  return out
}

/** PostHog `before_send`: strip auth tokens from every URL-like property. */
export function sanitizePosthogEvent(
  event: CaptureResult | null
): CaptureResult | null {
  if (!event || SKIPPED_EVENTS.has(event.event)) return event
  return {
    ...event,
    properties: sanitizeValue(
      event.properties,
      0
    ) as CaptureResult['properties'],
    ...(event.$set
      ? { $set: sanitizeValue(event.$set, 0) as CaptureResult['$set'] }
      : {}),
    ...(event.$set_once
      ? {
          $set_once: sanitizeValue(
            event.$set_once,
            0
          ) as CaptureResult['$set_once'],
        }
      : {}),
  }
}

/** The options main.tsx passes to PostHogProvider. */
export function buildPosthogOptions<T extends Partial<PostHogConfig>>(
  base: T
): T & Pick<PostHogConfig, 'before_send'> {
  return { ...base, before_send: sanitizePosthogEvent }
}
