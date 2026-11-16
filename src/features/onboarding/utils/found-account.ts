import type { ITwitterProfileFromExtension } from '@/features/twitter-commenting/utils/extension'
import type { IProfileResponseFromExtension } from '@/features/users/interface/profile.interface'

export type FoundAccount =
  | (IProfileResponseFromExtension & { _platform: 'linkedin' })
  | (ITwitterProfileFromExtension & { _platform: 'twitter' })

export interface FoundAccountView {
  name: string
  handle: string
  initials: string
  /** Public profile page, so the user can check it really is theirs. */
  url: string | null
}

/**
 * What the connect step shows for the account the extension found in this
 * browser, before anything is linked. The extension takes whichever session
 * the browser holds, which is often a boss's or a client's, and the targeting
 * is then built from that person's profile.
 */
export function describeFoundAccount(account: FoundAccount): FoundAccountView {
  const fullName = [account.firstName, account.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (account._platform === 'twitter') {
    const name = account.displayName?.trim() || fullName || 'X account'
    const screenName = account.screenName?.trim()
    return {
      name,
      handle: screenName ? `@${screenName}` : '',
      initials: name.charAt(0).toUpperCase(),
      url: screenName ? `https://x.com/${encodeURIComponent(screenName)}` : null,
    }
  }

  const slug = account.publicIdentifier?.trim()
  const name = fullName || slug || 'LinkedIn account'
  const initials =
    `${account.firstName?.charAt(0) ?? ''}${account.lastName?.charAt(0) ?? ''}`.toUpperCase() ||
    name.charAt(0).toUpperCase()
  return {
    name,
    handle: slug ? `linkedin.com/in/${slug}` : '',
    initials,
    url: slug
      ? `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`
      : null,
  }
}
