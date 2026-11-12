import type { CaptureResult } from 'posthog-js'
import { describe, expect, it } from 'vitest'
import {
  buildPosthogOptions,
  sanitizePosthogEvent,
  sanitizeUrl,
} from './posthog-sanitize'

const OAUTH_URL =
  'https://app.commentify.co/#access_token=abc&refresh_token=def&provider_token=ghi&expires_at=1&token_type=bearer'

function event(overrides: Partial<CaptureResult> = {}): CaptureResult {
  return {
    uuid: 'u1',
    event: '$pageview',
    properties: { $current_url: OAUTH_URL },
    ...overrides,
  }
}

const beforeSend = buildPosthogOptions({}).before_send as (
  e: CaptureResult | null
) => CaptureResult | null

describe('PostHog before_send', () => {
  it('strips the OAuth fragment from $current_url', () => {
    const out = beforeSend(
      event({
        properties: {
          $current_url:
            'https://app.commentify.co/#access_token=abc&refresh_token=def',
        },
      })
    )
    expect(out?.properties.$current_url).toBe('https://app.commentify.co/')
  })

  it('scrubs referrer, initial props, $set/$set_once and exception frames', () => {
    const out = sanitizePosthogEvent(
      event({
        event: '$exception',
        properties: {
          $current_url: OAUTH_URL,
          $referrer: OAUTH_URL,
          $initial_current_url: OAUTH_URL,
          $exception_list: [
            {
              value: `Failed to load ${OAUTH_URL}`,
              stacktrace: {
                frames: [{ filename: OAUTH_URL, abs_path: OAUTH_URL }],
              },
            },
          ],
        },
        $set: { $current_url: OAUTH_URL },
        $set_once: { $initial_current_url: OAUTH_URL },
      })
    )
    const serialized = JSON.stringify(out)
    for (const secret of ['abc', 'def', 'ghi']) {
      expect(serialized).not.toContain(`=${secret}`)
    }
    expect(out?.properties.$referrer).toBe('https://app.commentify.co/')
  })

  it('removes token query params but keeps the rest of the URL', () => {
    expect(
      sanitizeUrl(
        'https://app.commentify.co/auth/callback?code=xyz&next=%2Fagents'
      )
    ).toBe('https://app.commentify.co/auth/callback?next=%2Fagents')
  })

  it('leaves clean events and non-URL values alone', () => {
    const clean = event({
      properties: {
        $current_url: 'https://app.commentify.co/agents',
        count: 3,
      },
    })
    expect(sanitizePosthogEvent(clean)).toEqual(clean)
    expect(sanitizePosthogEvent(null)).toBeNull()
  })
})
