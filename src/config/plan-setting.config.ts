import type { IUser } from '@/features/auth/interface/user.interface'
import { getAgentPlanTier } from '@/features/agent-system/registry'
import { isLegacyProduct } from '@/features/pricing/utils/prices.util'

type PlanSettingValue = number | string | boolean

export const planSetting: Record<
  string,
  {
    starter: PlanSettingValue
    pro: PlanSettingValue
    premium: PlanSettingValue
  }
> = {
  numberOfPostsToScrapePerDay: {
    starter: 20,
    pro: 50,
    premium: 100,
  },
  salesMentionsPerDay: {
    starter: 15,
    pro: 30,
    premium: 50,
  },
  tagAuthor: {
    starter: false,
    pro: true,
    premium: true,
  },
  engagementThreshold: {
    starter: false,
    pro: false,
    premium: true,
  },
  scrapeRules: {
    starter: false,
    pro: true,
    premium: true,
  },
  commentRules: {
    starter: false,
    pro: true,
    premium: true,
  },
  geography: {
    starter: false,
    pro: false,
    premium: true,
  },
  authorTitles: {
    starter: false,
    pro: false,
    premium: true,
  },
  monitoredProfiles: {
    starter: 0,
    pro: 10,
    premium: 30,
  },
}

// New two-agent catalog (Starter $39 / Pro $59). Distinct from the legacy
// 3-tier matrix above: New Pro carries the full former-Premium toggle set but
// its own numeric limits (80/40/30), and New Starter is its own mix
// (30 posts/day, 15 sales/day, 10 monitored, no advanced toggles).
export const newPlanSetting: Record<
  string,
  {
    starter: PlanSettingValue
    pro: PlanSettingValue
  }
> = {
  numberOfPostsToScrapePerDay: { starter: 30, pro: 80 },
  salesMentionsPerDay: { starter: 15, pro: 40 },
  tagAuthor: { starter: false, pro: true },
  engagementThreshold: { starter: false, pro: true },
  scrapeRules: { starter: false, pro: true },
  commentRules: { starter: false, pro: true },
  geography: { starter: false, pro: true },
  authorTitles: { starter: false, pro: true },
  monitoredProfiles: { starter: 10, pro: 30 },
}

/**
 * Resolve a plan-gated setting value for a user, accounting for which catalog
 * they subscribed under. Legacy subscribers use the 3-tier `planSetting`;
 * new two-agent catalog subscribers use `newPlanSetting`. Catalog is detected
 * via the product SKU (`isLegacyProduct`), so a legacy Pro stays gated to the
 * old Pro feature set even though a new Pro unlocks the former Premium filters.
 */
export function resolvePlanSetting(
  feature: string,
  user: IUser | undefined
): PlanSettingValue | undefined {
  const tier = getAgentPlanTier(user, 'comment')
  if (isLegacyProduct(user?.subscribedProduct)) {
    return planSetting[feature]?.[tier]
  }
  const newTier = tier === 'premium' ? 'pro' : tier
  return newPlanSetting[feature]?.[newTier]
}

// Posting-agent limits (Starter/Pro only). Values marked CONFIRM are placeholders
// pending product sign-off; keep in sync with backend `postPlanMapper`.
export const postPlanSetting: Record<
  string,
  {
    starter: PlanSettingValue
    pro: PlanSettingValue
  }
> = {
  postsPerWeek: {
    starter: 3, // CONFIRM
    pro: 5, // CONFIRM
  },
  trackedCreators: {
    starter: 3, // CONFIRM
    pro: 15, // CONFIRM
  },
  aiCarousels: {
    starter: false, // CONFIRM
    pro: true, // CONFIRM
  },
  aiImageGeneration: {
    starter: true, // CONFIRM
    pro: true, // CONFIRM
  },
}

/**
 * Resolve a posting-agent limit for a user from their `post` agent tier. The
 * posting catalog only has Starter/Pro, so a premium tier maps to Pro. Keep in
 * sync with the backend `resolvePostTier` / `postTierLimit` so the UI never
 * advertises a cap the API will reject (or under-reports one it would allow).
 */
export function resolvePostPlanSetting(
  feature: string,
  user: IUser | undefined
): PlanSettingValue | undefined {
  const tier = getAgentPlanTier(user, 'post')
  const postTier = tier === 'premium' ? 'pro' : tier
  return postPlanSetting[feature]?.[postTier]
}
