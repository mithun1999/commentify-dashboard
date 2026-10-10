import { getAgentPlanTier } from '@/features/agent-system/registry'
import {
  AgentType,
  IUser,
  UserSubscriptionStatus,
} from '@/features/auth/interface/user.interface'

const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, premium: 3 }

const LIVE: string[] = [
  UserSubscriptionStatus.ACTIVE,
  UserSubscriptionStatus.IN_TRIAL,
  UserSubscriptionStatus.PENDING,
]

/**
 * Whether the plan includes AI tools (MCP): Pro or Premium on either agent,
 * active or in trial. Mirrors `canUseMcp` on the backend, which is what
 * actually decides; this only draws the lock in the sidebar.
 */
export function canUseMcp(user?: IUser | null): boolean {
  if (!user || !LIVE.includes(user.status)) return false
  return (['comment', 'post'] as AgentType[]).some((agent) => {
    if (user.agents?.[agent]?.active === false) return false
    return TIER_RANK[getAgentPlanTier(user, agent)] >= TIER_RANK.pro
  })
}
