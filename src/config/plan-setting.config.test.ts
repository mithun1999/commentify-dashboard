import { describe, expect, it } from 'vitest'
import type { IUser } from '@/features/auth/interface/user.interface'
import {
  resolvePlanSetting,
  resolvePostPlanSetting,
} from './plan-setting.config'

const appsumo = (appsumoTier: number) =>
  ({
    appsumoTier,
    agents: {
      comment: { tier: appsumoTier === 1 ? 'starter' : 'pro' },
      post: { tier: appsumoTier === 1 ? 'starter' : 'pro' },
    },
  }) as unknown as IUser

const retailPro = {
  agents: { comment: { tier: 'pro' }, post: { tier: 'pro' } },
} as unknown as IUser

describe('AppSumo limits', () => {
  // The signed deal table, tier by tier.
  it.each([
    [1, 10, 3, 1],
    [2, 30, 15, 3],
    [3, 50, 25, 4],
    [4, 100, 40, 5],
  ])(
    'Tier %i gets what the deal says',
    (tier, monitored, creators, xPerDay) => {
      const user = appsumo(tier)
      expect(resolvePlanSetting('monitoredProfiles', user)).toBe(monitored)
      expect(resolvePostPlanSetting('trackedCreators', user)).toBe(creators)
      expect(resolvePostPlanSetting('xPostsPerDay', user)).toBe(xPerDay)
    }
  )

  it('leaves settings the deal does not raise on the plan', () => {
    expect(resolvePlanSetting('salesMentionsPerDay', appsumo(4))).toBe(40)
    expect(resolvePlanSetting('numberOfPostsToScrapePerDay', appsumo(4))).toBe(
      80
    )
  })

  it('leaves retail Pro where it is', () => {
    expect(resolvePlanSetting('monitoredProfiles', retailPro)).toBe(30)
    expect(resolvePostPlanSetting('trackedCreators', retailPro)).toBe(15)
    expect(resolvePostPlanSetting('xPostsPerDay', retailPro)).toBe(3)
  })
})
