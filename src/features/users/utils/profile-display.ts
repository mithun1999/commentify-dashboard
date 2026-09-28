import { getAgentType } from '@/features/agent-system/registry'
import { commentingAgentType } from '@/features/agent-system/hooks/use-agents'
import type { IProfile } from '@/features/users/interface/profile.interface'

export function profileDisplayName(profile: IProfile) {
  return profile.platform === 'twitter' && profile.screenName
    ? `@${profile.screenName}`
    : `${profile.firstName} ${profile.lastName}`.trim() ||
        `@${profile.publicIdentifier}`
}

/** Every agent a disconnect stops: commenting is implicit on each profile. */
export function affectedAgentNames(profile: IProfile): string[] {
  const slugs = Array.from(
    new Set([commentingAgentType(profile), ...(profile.activeAgentTypes ?? [])])
  )
  return slugs.map((slug) => getAgentType(slug)?.name ?? slug)
}
