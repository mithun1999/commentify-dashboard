import { describe, expect, it } from 'vitest'
import { typedAtTrigger } from './note-picker'

describe('typing @ to tag a note', () => {
  it('opens the picker at the start of the box or of a word', () => {
    expect(typedAtTrigger('@', '')).toBe(true)
    expect(typedAtTrigger('use @', 'use ')).toBe(true)
    expect(typedAtTrigger('line\n@', 'line\n')).toBe(true)
  })

  it('leaves emails, pastes and deletions alone', () => {
    expect(typedAtTrigger('me@', 'me')).toBe(false)
    expect(typedAtTrigger('ask @', 'ask')).toBe(false)
    expect(typedAtTrigger('a @', 'a @b')).toBe(false)
    expect(typedAtTrigger('x @', 'y ')).toBe(false)
  })
})
