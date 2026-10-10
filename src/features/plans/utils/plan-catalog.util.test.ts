import { describe, expect, it } from 'vitest'
import type { IProduct } from '@/features/pricing/interfaces/price.interface'
import { computeCartOrder } from './cart.util'
import { buildPlanCatalog, getPlan } from './plan-catalog.util'

const product = (p: Partial<IProduct> & { _id: string }): IProduct =>
  ({ status: 'active', currency: 'usd', interval: 'monthly', ...p }) as IProduct

const NEW_PLANS = [
  product({
    _id: 'comment_starter_monthly',
    name: 'Commenting Starter — Monthly',
    kind: 'plan',
    agentType: 'comment',
    tier: 'starter',
    defaultPrice: 3900,
  }),
  product({
    _id: 'comment_pro_monthly',
    name: 'Commenting Pro — Monthly',
    kind: 'plan',
    agentType: 'comment',
    tier: 'pro',
    defaultPrice: 5900,
  }),
  product({
    _id: 'comment_pro_yearly',
    name: 'Commenting Pro — Yearly',
    kind: 'plan',
    agentType: 'comment',
    tier: 'pro',
    interval: 'yearly',
    defaultPrice: 58800,
  }),
  product({
    _id: 'slot_post_pro_monthly',
    name: 'Posting Profile — Pro Monthly',
    kind: 'addon',
    addonType: 'slot',
    agentType: 'post',
    tier: 'pro',
    defaultPrice: 5900,
  }),
  product({
    _id: 'topup_post_small',
    name: 'Posting Top-up — 15 Generations',
    kind: 'topup',
    agentType: 'post',
    defaultPrice: 900,
  }),
]

// Legacy plans are still active (existing subscribers renew on them) and the
// API currently lists them after the new plans.
const LEGACY_PLANS = [
  product({ _id: 'pro_monthly', name: 'Pro Monthly', defaultPrice: 1900 }),
  product({
    _id: 'premium_monthly',
    name: 'Premium Monthly',
    defaultPrice: 3900,
  }),
  product({
    _id: 'premium_yearly',
    name: 'Premium Yearly',
    interval: 'yearly',
    defaultPrice: 39700,
  }),
  product({
    _id: 'pro_yearly',
    name: 'Pro Yearly',
    interval: 'yearly',
    defaultPrice: 19700,
  }),
]

describe('buildPlanCatalog', () => {
  it('never offers a legacy plan, whatever order the API returns', () => {
    for (const list of [
      [...NEW_PLANS, ...LEGACY_PLANS],
      [...LEGACY_PLANS, ...NEW_PLANS],
    ]) {
      const catalog = buildPlanCatalog(list)
      expect(getPlan(catalog, 'comment', 'pro', 'monthly')?._id).toBe(
        'comment_pro_monthly'
      )
      expect(getPlan(catalog, 'comment', 'pro', 'yearly')?._id).toBe(
        'comment_pro_yearly'
      )
      expect(getPlan(catalog, 'comment', 'starter', 'monthly')?._id).toBe(
        'comment_starter_monthly'
      )
      const indexed = [...catalog.plans.values()].map((p) => p._id)
      for (const legacy of LEGACY_PLANS)
        expect(indexed).not.toContain(legacy._id)
    }
  })

  it('puts a Pro + posting cart on the new commenting plan', () => {
    const catalog = buildPlanCatalog([...NEW_PLANS, ...LEGACY_PLANS])
    const order = computeCartOrder(
      catalog,
      { comment: 'pro', post: 'pro' },
      'monthly',
      {},
      false
    )
    expect(order.baseProduct?._id).toBe('comment_pro_monthly')
    expect(order.addons).toEqual([
      { productId: 'slot_post_pro_monthly', quantity: 1 },
    ])
    expect(order.subtotalCents).toBe(5900 + 5900)
  })
})
