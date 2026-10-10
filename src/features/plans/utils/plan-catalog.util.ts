import type {
  IProduct,
  ProductAgentType,
  ProductTier,
} from '@/features/pricing/interfaces/price.interface'

export type Interval = 'monthly' | 'yearly'
export type CartTier = ProductTier

export interface PlanCatalog {
  /** Base plans keyed by `${agent}_${tier}_${interval}`. */
  plans: Map<string, IProduct>
  /**
   * Unified slot add-ons keyed by `${agent}_${tier}_${interval}_${variant}`. A
   * slot is one (agent × tier) profile instance — the single add-on family for
   * everything above the base plan (extra profiles, a second agent, a second
   * platform). `standard` = full tier rate; `discounted` = the 20% bundle twin
   * used for in-place upsells (price baked into the product).
   */
  slots: Map<string, IProduct>
}

const planKey = (a: ProductAgentType, t: CartTier, i: Interval) => `${a}_${t}_${i}`
const slotKey = (
  a: ProductAgentType,
  t: CartTier,
  i: Interval,
  variant: 'standard' | 'discounted',
) => `${a}_${t}_${i}_${variant}`

/**
 * Index the flat `/product/list` response into the structures the cart needs.
 * Only active products are indexed, so retired legacy add-ons (the old
 * `agent`/`platform` families, now inactive) are ignored automatically.
 *
 * Legacy base plans (Pro/Premium Monthly/Yearly: no `agentType`/`kind`) stay
 * active so their existing subscribers keep renewing, but they are never sold:
 * new checkouts and upgrades always land on the current per-agent plans. They
 * must not be indexed — they would collide with the new plan's key, the winner
 * would depend on the API's row order, and the new slot add-ons are not
 * attached to the legacy plans in Dodo (checkout fails with a 422).
 */
export function buildPlanCatalog(products: IProduct[]): PlanCatalog {
  const plans = new Map<string, IProduct>()
  const slots = new Map<string, IProduct>()

  for (const p of products) {
    if (p.status !== 'active') continue

    if (p.kind === 'addon') {
      if (p.addonType === 'slot' && p.agentType && p.tier) {
        slots.set(slotKey(p.agentType, p.tier, p.interval, p.variant ?? 'standard'), p)
      }
      continue
    }

    if (p.kind === 'plan' && p.agentType && p.tier) {
      plans.set(planKey(p.agentType, p.tier, p.interval), p)
    }
  }

  return { plans, slots }
}

export function getPlan(
  catalog: PlanCatalog,
  agent: ProductAgentType,
  tier: CartTier,
  interval: Interval,
): IProduct | undefined {
  return catalog.plans.get(planKey(agent, tier, interval))
}

/**
 * Resolve a slot add-on. One slot = one (agent × tier) profile instance.
 * `standard` = full rate (extra profile / 2nd agent on a new joint checkout);
 * `discounted` = the 20% bundle twin (2nd agent in-place / 2nd platform).
 */
export function getSlot(
  catalog: PlanCatalog,
  agent: ProductAgentType,
  tier: CartTier,
  interval: Interval,
  variant: 'standard' | 'discounted' = 'standard',
): IProduct | undefined {
  return catalog.slots.get(slotKey(agent, tier, interval, variant))
}
