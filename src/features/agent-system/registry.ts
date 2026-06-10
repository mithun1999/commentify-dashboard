import { type ComponentType } from 'react'
import { IconBrandLinkedin, IconBrandX, IconPencil } from '@tabler/icons-react'
import type { AgentType, IUser, PlanTier } from '@/features/auth/interface/user.interface'
import type {
  AgentCapability,
  AgentTypeDefinition,
  Platform,
} from './types/agent.types'

const PlaceholderComponent = () => null

const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, premium: 3 }

function isPlanTier(value?: string): value is PlanTier {
  return !!value && value in TIER_RANK
}

/**
 * Resolve a user's tier for a given agent. Prefers the per-agent entitlement
 * snapshot (`user.agents[agent]`); for the comment agent, falls back to parsing
 * the legacy base-product SKU/name for subscribers synced before `agents`
 * existed. The SKU token scan handles both the legacy tier-first format
 * (`pro_monthly`) and the two-agent agent-first format (`comment_pro_monthly`).
 */
function getAgentTier(
  user: IUser | undefined,
  agent: AgentType
): PlanTier | undefined {
  const snapshot = user?.agents?.[agent]
  if (snapshot?.tier) return snapshot.tier
  if (agent === 'comment') {
    const skuToken = user?.subscribedProduct?.sku
      ?.toLowerCase()
      ?.split('_')
      .find(isPlanTier)
    if (skuToken) return skuToken
    const nameWord = user?.subscribedProduct?.name
      ?.toLowerCase()
      ?.split(' ')
      .find(isPlanTier)
    if (nameWord) return nameWord
  }
  return undefined
}

/**
 * Tier for an agent, defaulting to `starter` when unresolved. Use this for
 * plan-gated settings UIs so they read the per-agent entitlement instead of
 * naively parsing the base-product SKU.
 */
export function getAgentPlanTier(
  user: IUser | undefined,
  agent: AgentType
): PlanTier {
  return getAgentTier(user, agent) ?? 'starter'
}

function hasMinTier(
  user: IUser | undefined,
  agent: AgentType,
  min: PlanTier
): boolean {
  const tier = getAgentTier(user, agent)
  return !!tier && TIER_RANK[tier] >= TIER_RANK[min]
}

export const AGENT_TYPES: Record<string, AgentTypeDefinition> = {
  'linkedin-commenting': {
    slug: 'linkedin-commenting',
    name: 'LinkedIn Commenting',
    description:
      'Automatically find and comment on relevant LinkedIn posts to grow your network and visibility.',
    icon: IconBrandLinkedin,
    platform: 'linkedin',
    capability: 'comment',
    access: 'invite-only',
    badge: 'Invite Only',
    isEligible: (user) => hasMinTier(user, 'comment', 'pro'),
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
    capability: 'comment',
    access: 'open',
    scrapeSettingsComponent: PlaceholderComponent,
    commentSettingsComponent: PlaceholderComponent,
    queueColumns: [],
    queueItemComponent: PlaceholderComponent,
  },
  'linkedin-posting': {
    slug: 'linkedin-posting',
    name: 'LinkedIn Posting',
    description:
      'AI-powered content calendar that generates, refines, and publishes LinkedIn posts on your behalf.',
    icon: IconPencil,
    platform: 'linkedin',
    capability: 'post',
    access: 'open',
    badge: 'Beta',
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
  platform: Platform
): AgentTypeDefinition[] {
  return getAllAgentTypes().filter((t) => t.platform === platform)
}

/** Resolve the agent type that does `capability` on `platform`, if any. */
export function getAgentTypeFor(
  platform: Platform,
  capability: AgentCapability
): AgentTypeDefinition | undefined {
  return getAllAgentTypes().find(
    (t) => t.platform === platform && t.capability === capability
  )
}

export interface PlatformCapabilityOption {
  capability: AgentCapability
  label: string
  status: 'available' | 'coming-soon'
  agentSlug?: string
}

export interface PlatformMeta {
  id: Platform
  name: string
  icon: ComponentType<{ className?: string }>
  capabilities: PlatformCapabilityOption[]
}

const CAPABILITY_LABEL: Record<AgentCapability, string> = {
  comment: 'Commenting',
  post: 'Posting',
}

const PLATFORM_ORDER: { id: Platform; name: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'linkedin', name: 'LinkedIn', icon: IconBrandLinkedin },
  { id: 'twitter', name: 'X (Twitter)', icon: IconBrandX },
]

/** Capabilities we want to surface as "coming soon" even with no agent yet. */
const COMING_SOON: Partial<Record<Platform, AgentCapability[]>> = {
  twitter: ['post'],
}

/**
 * Platform-first view of the catalog for the selection UI: each platform with
 * its available capabilities (resolved from the registry) plus any explicitly
 * "coming soon" capabilities that don't have an agent type yet.
 */
export function getPlatforms(): PlatformMeta[] {
  return PLATFORM_ORDER.map(({ id, name, icon }) => {
    const available: PlatformCapabilityOption[] = getAgentTypesForPlatform(id).map(
      (t) => ({
        capability: t.capability,
        label: CAPABILITY_LABEL[t.capability],
        status: 'available' as const,
        agentSlug: t.slug,
      })
    )
    const soon: PlatformCapabilityOption[] = (COMING_SOON[id] ?? [])
      .filter((cap) => !available.some((a) => a.capability === cap))
      .map((cap) => ({
        capability: cap,
        label: CAPABILITY_LABEL[cap],
        status: 'coming-soon' as const,
      }))

    const order: AgentCapability[] = ['comment', 'post']
    const capabilities = [...available, ...soon].sort(
      (a, b) => order.indexOf(a.capability) - order.indexOf(b.capability)
    )
    return { id, name, icon, capabilities }
  })
}
