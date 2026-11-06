import { describe, expect, it } from 'vitest'
import { firstFormError } from './form-errors'

describe('firstFormError', () => {
  it('finds a field message', () => {
    expect(
      firstFormError({ keywords: { type: 'too_big', message: 'Too many' } })
    ).toBe('Too many')
  })

  it('finds a message nested in an array field', () => {
    expect(
      firstFormError({ painPoints: [undefined, { message: 'Required' }] })
    ).toBe('Required')
  })

  it('returns nothing when no error has a message', () => {
    expect(firstFormError({ keywords: { type: 'too_big' } })).toBeUndefined()
    expect(firstFormError({})).toBeUndefined()
  })
})
