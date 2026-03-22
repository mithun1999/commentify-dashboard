import { useMemo } from 'react'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import type { IProfile } from '@/features/users/interface/profile.interface'
import type { DerivedAgent, Platform } from '../types/agent.types'

export function inferPlatform(profile: IProfile): Platform {
  return profile.platform === 'twitter' ? 'twitter' : 'linkedin'
}

function agentTypeForPlatform(platform: Platform): string {
  return platform === 'twitter' ? 'twitter-commenting' : 'linkedin-commenting'
}

export function deriveAgentFromProfile(profile: IProfile): DerivedAgent {
  const platform = inferPlatform(profile)
  const agentType = agentTypeForPlatform(platform)

  return {
    id: `${profile._id}-${agentType}`,
    type: agentType,
    profileId: profile._id,
    profileName:
      platform === 'twitter' && profile.screenName
        ? `@${profile.screenName}`
        : `${profile.firstName} ${profile.lastName}`,
    platform,
    status: profile.status,
  }
}

export function useAgents() {
  const { data: profiles, isLoading, isFetched } = useGetAllProfileQuery()

  const agents = useMemo(() => {
    if (!profiles) return []
    return profiles.map(deriveAgentFromProfile)
  }, [profiles])

  return { agents, isLoading, isFetched, profiles }
}
