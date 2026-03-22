import { useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { getAgentType } from '../registry'
import { deriveAgentFromProfile, inferPlatform } from './use-agents'

export function useCurrentAgent() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId?: string
    agentType?: string
  }
  const { data: profiles } = useGetAllProfileQuery()

  return useMemo(() => {
    if (!profileId || !agentType || !profiles) {
      return { agent: null, profile: null, agentTypeDef: null }
    }

    const profile = profiles.find((p) => p._id === profileId)
    if (!profile) {
      return { agent: null, profile: null, agentTypeDef: null }
    }

    const platform = inferPlatform(profile)
    const expectedType =
      platform === 'twitter' ? 'twitter-commenting' : 'linkedin-commenting'

    if (agentType !== expectedType) {
      return { agent: null, profile: null, agentTypeDef: null }
    }

    const agent = deriveAgentFromProfile(profile)
    const agentTypeDef = getAgentType(agentType)

    return { agent, profile, agentTypeDef: agentTypeDef ?? null }
  }, [profileId, agentType, profiles])
}
