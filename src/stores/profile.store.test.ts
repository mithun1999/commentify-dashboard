import { describe, expect, it } from 'vitest'
import { filterRecentlyDisconnected } from './profile.store'
import type { IProfile } from '@/features/users/interface/profile.interface'

const p = (id: string) => ({ _id: id }) as IProfile

describe('filterRecentlyDisconnected', () => {
  // C7: a stale in-flight list response must not reintroduce the account.
  it('hides an account disconnected on this client moments ago', () => {
    const now = 1_000_000
    expect(
      filterRecentlyDisconnected([p('a'), p('b')], { a: now - 5_000 }, now).map((x) => x._id)
    ).toEqual(['b'])
  })

  it('stops hiding it once the window has passed', () => {
    const now = 1_000_000
    expect(
      filterRecentlyDisconnected([p('a')], { a: now - 3 * 60 * 1000 }, now).map((x) => x._id)
    ).toEqual(['a'])
  })

  it('returns the same array when nothing was disconnected', () => {
    const list = [p('a')]
    expect(filterRecentlyDisconnected(list, {})).toBe(list)
  })
})
