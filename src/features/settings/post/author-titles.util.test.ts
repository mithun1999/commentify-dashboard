import { describe, expect, it } from 'vitest'
import { isAuthorTitlesFull, isTitleChipDisabled } from './author-titles.util'

const six = ['Founder', 'CEO', 'CTO', 'CMO', 'VP', 'Director']

describe('author title chips', () => {
  it('disables unselected chips and Other once 6 are selected', () => {
    expect(isTitleChipDisabled('Head of Sales', six)).toBe(true)
    expect(isAuthorTitlesFull(six)).toBe(true)
  })

  it('keeps selected chips clickable at the cap', () => {
    expect(isTitleChipDisabled('CEO', six)).toBe(false)
  })

  it('keeps selected chips clickable above the cap so old data can be trimmed', () => {
    const ten = [...six, 'CFO', 'HR', 'COO', 'Partner']
    expect(isTitleChipDisabled('Partner', ten)).toBe(false)
    expect(isTitleChipDisabled('Head of Sales', ten)).toBe(true)
  })

  it('leaves everything enabled below the cap', () => {
    const five = six.slice(0, 5)
    expect(isTitleChipDisabled('Director', five)).toBe(false)
    expect(isAuthorTitlesFull(five)).toBe(false)
  })
})
