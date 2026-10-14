import { hasLivePlanTier } from '@/features/agent-system/registry'
import { IUser } from '@/features/auth/interface/user.interface'

/**
 * Whether the plan includes AI tools (MCP): Pro or Premium on either agent,
 * active or in trial. Mirrors `canUseMcp` on the backend, which is what
 * actually decides; this only draws the lock in the sidebar.
 */
export function canUseMcp(user?: IUser | null): boolean {
  return (
    hasLivePlanTier(user, 'comment', 'pro') ||
    hasLivePlanTier(user, 'post', 'pro')
  )
}
