import { describe, expect, it } from 'vitest'
import { joinThread, splitThread, xWeightedLength } from './x-text'

// Same cases as the backend's x-text.util.spec: the editor must count what the
// publisher will.
describe('xWeightedLength', () => {
  it('counts plain text one per character', () => {
    expect(xWeightedLength('hello world')).toBe(11)
  })

  it('counts every link as 23', () => {
    expect(xWeightedLength('see https://example.com/a/very/long/path')).toBe(4 + 23)
    expect(xWeightedLength('commentify.co')).toBe(23)
  })

  it('counts emoji and CJK as two', () => {
    expect(xWeightedLength('🚀')).toBe(2)
    expect(xWeightedLength('👨‍👩‍👧')).toBe(2)
    expect(xWeightedLength('日本')).toBe(4)
  })
})

describe('thread text', () => {
  it('splits on separator lines only and joins back', () => {
    const text = joinThread(['one --- two', 'three', '  '])
    expect(splitThread(text)).toEqual(['one --- two', 'three'])
  })
})
