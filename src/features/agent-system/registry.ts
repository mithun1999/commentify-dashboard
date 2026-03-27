import { IconBrandLinkedin, IconBrandX } from '@tabler/icons-react'
import type { AgentTypeDefinition } from './types/agent.types'

const PlaceholderComponent = () => null

export const AGENT_TYPES: Record<string, AgentTypeDefinition> = {
  'linkedin-commenting': {
    slug: 'linkedin-commenting',
    name: 'LinkedIn Commenting',
    description:
      'Automatically find and comment on relevant LinkedIn posts to grow your network and visibility.',
    icon: IconBrandLinkedin,
    platform: 'linkedin',
    access: 'invite-only',
    badge: 'Invite Only',
    isEligible: (user) => {
      const plan = user.subscribedProduct?.name?.toLowerCase()?.split(' ')[0]
      return plan === 'pro' || plan === 'premium'
    },
    scrapeSettingsComponent: PlaceholderComponent,
    commentSettingsComponent: PlaceholderComponent,
    queueColumns: [],
    queueItemComponent: PlaceholderComponent,
  },
  'twitter-commenting': {
    slug: 'twitter-commenting',
    name: 'Twitter Commenting',
    description:
      'Automatically find and reply to relevant tweets to build your presence on X.',
    icon: IconBrandX,
    platform: 'twitter',
    access: 'open',
    scrapeSettingsComponent: PlaceholderComponent,
    commentSettingsComponent: PlaceholderComponent,
    queueColumns: [],
    queueItemComponent: PlaceholderComponent,
  },
}

export function getAgentType(slug: string): AgentTypeDefinition | undefined {
  return AGENT_TYPES[slug]
}

export function getAgentTypeOrThrow(slug: string): AgentTypeDefinition {
  const agentType = AGENT_TYPES[slug]
  if (!agentType) {
    throw new Error(`Unknown agent type: ${slug}`)
  }
  return agentType
}

export function getAllAgentTypes(): AgentTypeDefinition[] {
  return Object.values(AGENT_TYPES)
}

export function getAgentTypesForPlatform(
  platform: 'linkedin' | 'twitter'
): AgentTypeDefinition[] {
  return getAllAgentTypes().filter((t) => t.platform === platform)
}
