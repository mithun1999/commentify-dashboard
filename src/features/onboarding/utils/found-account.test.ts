import { describe, expect, it } from 'vitest'
import { describeFoundAccount, type FoundAccount } from './found-account'

const linkedin = (over: Partial<FoundAccount> = {}) =>
  ({
    _platform: 'linkedin',
    userAgent: 'ua',
    isWindowsBasedSystem: false,
    linkedinToken: 't',
    csrfToken: 'c',
    firstName: 'Huibin',
    lastName: 'Yu',
    publicIdentifier: 'huibinyu',
    ...over,
  }) as FoundAccount

const twitter = (over: Partial<FoundAccount> = {}) =>
  ({
    _platform: 'twitter',
    platform: 'twitter',
    authToken: 'a',
    csrfToken: 'c',
    cookieDump: [],
    twitterUserId: '1',
    screenName: 'jane',
    displayName: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    userAgent: 'ua',
    ...over,
  }) as FoundAccount

describe('describeFoundAccount', () => {
  it('names the LinkedIn account and links to its public profile', () => {
    expect(describeFoundAccount(linkedin())).toEqual({
      name: 'Huibin Yu',
      handle: 'linkedin.com/in/huibinyu',
      initials: 'HY',
      url: 'https://www.linkedin.com/in/huibinyu/',
    })
  })

  it('falls back to the profile slug when the name is missing', () => {
    const view = describeFoundAccount(
      linkedin({ firstName: undefined, lastName: undefined })
    )
    expect(view.name).toBe('huibinyu')
    expect(view.initials).toBe('H')
  })

  it('has no link without a public identifier', () => {
    const view = describeFoundAccount(linkedin({ publicIdentifier: undefined }))
    expect(view.url).toBeNull()
    expect(view.handle).toBe('')
  })

  it('escapes the slug in the profile URL', () => {
    expect(
      describeFoundAccount(linkedin({ publicIdentifier: 'a b' })).url
    ).toBe('https://www.linkedin.com/in/a%20b/')
  })

  it('names the X account by display name and handle', () => {
    expect(describeFoundAccount(twitter())).toEqual({
      name: 'Jane Doe',
      handle: '@jane',
      initials: 'J',
      url: 'https://x.com/jane',
    })
  })

  it('falls back to first and last name for X', () => {
    expect(describeFoundAccount(twitter({ displayName: '' })).name).toBe(
      'Jane Doe'
    )
  })
})
