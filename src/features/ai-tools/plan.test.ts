import { describe, expect, it } from 'vitest'
import type { IUser } from '@/features/auth/interface/user.interface'
import { canUseMcp } from './plan'

const user = (agents: IUser['agents'], status = 'active', extra = {}) =>
  ({ status, agents, metadata: {}, ...extra }) as unknown as IUser

describe('canUseMcp', () => {
  it('is on for Pro or Premium on either agent, trials included', () => {
    expect(canUseMcp(user({ comment: { tier: 'pro', active: true } }))).toBe(
      true
    )
    expect(
      canUseMcp(user({ comment: { tier: 'pro', active: true } }, 'in-trial'))
    ).toBe(true)
    expect(
      canUseMcp(
        user({
          comment: { tier: 'starter', active: true },
          post: { tier: 'pro', active: true },
        })
      )
    ).toBe(true)
    expect(
      canUseMcp(user({ comment: { tier: 'premium', active: true } }))
    ).toBe(true)
  })

  it('reads a legacy subscriber’s tier from their product', () => {
    expect(
      canUseMcp(
        user(undefined, 'active', { subscribedProduct: { sku: 'pro_monthly' } })
      )
    ).toBe(true)
  })

  it('is off for Starter, a paused agent, or a lapsed plan', () => {
    expect(
      canUseMcp(user({ comment: { tier: 'starter', active: true } }))
    ).toBe(false)
    expect(canUseMcp(user({ comment: { tier: 'pro', active: false } }))).toBe(
      false
    )
    expect(
      canUseMcp(
        user({ comment: { tier: 'pro', active: true } }, 'trial-expired')
      )
    ).toBe(false)
    expect(canUseMcp(undefined)).toBe(false)
  })
})
