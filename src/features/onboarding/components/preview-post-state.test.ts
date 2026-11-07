import { describe, expect, it } from 'vitest'
import type { PostingPreview } from '../api/preview.api'
import {
  msUntilSlow,
  nextPoll,
  POLL_MS,
  showsFailure,
  SLOW_AFTER_MS,
} from './preview-post-state'

const preview = (over: Partial<PostingPreview> = {}) =>
  ({
    phase: 'drafting',
    imagePending: false,
    post: null,
    ...over,
  }) as PostingPreview

const post = (content: string) =>
  ({ content }) as NonNullable<PostingPreview['post']>

describe('nextPoll', () => {
  it('keeps reading while the backend is working, however long it takes', () => {
    expect(nextPoll(preview({ phase: 'drafting' }))).toBe(POLL_MS)
    expect(nextPoll(preview({ phase: 'voice' }))).toBe(POLL_MS)
    expect(nextPoll(preview({ phase: 'none' }))).toBe(POLL_MS)
    expect(nextPoll(undefined)).toBe(POLL_MS)
  })

  it('stops on a failure', () => {
    expect(nextPoll(preview({ phase: 'failed' }))).toBe(false)
  })

  it('keeps reading a finished draft while its image is on the way', () => {
    expect(nextPoll(preview({ phase: 'ready', imagePending: true }))).toBe(
      POLL_MS
    )
  })

  it('stops once the backend says no image is coming', () => {
    expect(nextPoll(preview({ phase: 'ready', imagePending: false }))).toBe(
      false
    )
  })
})

describe('msUntilSlow', () => {
  it('counts down from the start of the run', () => {
    expect(msUntilSlow(1_000, 1_000)).toBe(SLOW_AFTER_MS)
    expect(msUntilSlow(1_000, 31_000)).toBe(SLOW_AFTER_MS - 30_000)
  })

  it('is already slow when a reload lands past the limit', () => {
    expect(msUntilSlow(0, SLOW_AFTER_MS + 5_000)).toBe(0)
  })
})

describe('showsFailure', () => {
  it('shows what the backend reports', () => {
    expect(showsFailure(preview({ phase: 'failed' }), false)).toBe(true)
  })

  it('never fails a wait the backend has not called, however long', () => {
    expect(showsFailure(preview({ phase: 'drafting' }), false)).toBe(false)
    expect(showsFailure(preview({ phase: 'none' }), false)).toBe(false)
  })

  it('never shows over a written draft', () => {
    expect(
      showsFailure(preview({ phase: 'failed', post: post('a draft') }), true)
    ).toBe(false)
  })

  it('shows when the request to begin never landed', () => {
    expect(showsFailure(undefined, true)).toBe(true)
    expect(showsFailure(preview({ phase: 'none' }), true)).toBe(true)
  })

  it('drops that once a post turns up, because it landed after all', () => {
    expect(
      showsFailure(preview({ phase: 'drafting', post: post('') }), true)
    ).toBe(false)
  })
})
