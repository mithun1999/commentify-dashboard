import { useMemo } from 'react'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import type { IProfile } from '@/features/users/interface/profile.interface'
import type { AgentMode, DerivedAgent, Platform } from '../types/agent.types'

export function inferPlatform(profile: IProfile): Platform {
  return profile.platform === 'twitter' ? 'twitter' : 'linkedin'
}

export function inferAgentMode(profile: IProfile): AgentMode {
  return (profile.setting?.agentMode as AgentMode) || 'branding'
}

function defaultAgentTypes(platform: Platform): string[] {
  return platform === 'twitter' ? ['twitter-commenting'] : ['linkedin-commenting']
}

export function deriveAgentFromProfile(profile: IProfile, overrideType?: string): DerivedAgent {
  const platform = inferPlatform(profile)
  const agentType = overrideType || defaultAgentTypes(platform)[0]
  const agentMode = inferAgentMode(profile)

  return {
    id: `${profile._id}-${agentType}`,
    type: agentType,
    profileId: profile._id,
    profileName:
      platform === 'twitter' && profile.screenName
        ? `@${profile.screenName}`
        : `${profile.firstName} ${profile.lastName}`,
    platform,
    agentMode,
    status: profile.status,
  }
}

export function useAgents() {
  const { data: profiles, isLoading, isFetched } = useGetAllProfileQuery()

  const agents = useMemo(() => {
    if (!profiles) return []
    const result: DerivedAgent[] = []
    for (const p of profiles) {
      const platform = inferPlatform(p)
      const commentingType = defaultAgentTypes(platform)[0]
      result.push(deriveAgentFromProfile(p, commentingType))
      const extras = (p.activeAgentTypes ?? []).filter((t) => t !== commentingType)
      for (const agentType of extras) {
        result.push(deriveAgentFromProfile(p, agentType))
      }
    }
    return result
  }, [profiles])

  return { agents, isLoading, isFetched, profiles }
}
