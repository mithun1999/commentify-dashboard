import { describe, expect, it } from 'vitest'
import type { IUser } from '@/features/auth/interface/user.interface'
import { hasLivePlanTier } from './registry'

const user = (agents: IUser['agents'], status = 'active', extra = {}) =>
  ({ status, agents, metadata: {}, ...extra }) as unknown as IUser

describe('hasLivePlanTier', () => {
  it('unlocks comment Pro features on comment Pro or Premium, trials included', () => {
    expect(
      hasLivePlanTier(
        user({ comment: { tier: 'pro', active: true } }),
        'comment',
        'pro'
      )
    ).toBe(true)
    expect(
      hasLivePlanTier(
        user({ comment: { tier: 'premium', active: true } }, 'in-trial'),
        'comment',
        'pro'
      )
    ).toBe(true)
    expect(
      hasLivePlanTier(
        user(undefined, 'active', {
          subscribedProduct: { sku: 'pro_monthly' },
        }),
        'comment',
        'pro'
      )
    ).toBe(true)
  })

  it('keeps them locked on comment Starter, even with posting Pro', () => {
    expect(
      hasLivePlanTier(
        user({
          comment: { tier: 'starter', active: true },
          post: { tier: 'pro', active: true },
        }),
        'comment',
        'pro'
      )
    ).toBe(false)
  })

  it('keeps them locked when the agent is off or the plan has lapsed', () => {
    expect(
      hasLivePlanTier(
        user({ comment: { tier: 'pro', active: false } }),
        'comment',
        'pro'
      )
    ).toBe(false)
    expect(
      hasLivePlanTier(
        user({ comment: { tier: 'pro', active: true } }, 'inactive'),
        'comment',
        'pro'
      )
    ).toBe(false)
    expect(hasLivePlanTier(undefined, 'comment', 'pro')).toBe(false)
  })
})
