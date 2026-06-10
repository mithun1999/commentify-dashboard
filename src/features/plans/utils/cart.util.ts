import type {
  IProduct,
  ProductAgentType,
} from '@/features/pricing/interfaces/price.interface'
import {
  getPlan,
  getSlot,
  type CartTier,
  type Interval,
  type PlanCatalog,
} from './plan-catalog.util'

/**
 * Cross-agent bundle discounts. These MUST match the backend's single source of
 * truth in `linkedin-scraper-be/src/domains/payment/common/constants/
 * bundle-discount.constant.ts` (separate repo, no shared package) — that module
 * is what the provisioning script uses to create the Dodo discount objects, so
 * the cart preview here only equals the actual charge while the two agree.
 */

/** Whole-subscription cross-sell code for a NEW MIXED-tier joint checkout (scaling 20%). */
export const BUNDLE_DISCOUNT_CODE = 'BUNDLEAGENT20'
export const MIXED_BUNDLE_BPS = 2000

/**
 * Both-Pro "Power Bundle" uses a per-interval percentage tuned so the headline price
 * lands on a 9-ending number ($99/mo, $79/mo billed yearly). Discounts are computed
 * the same way Dodo does (round to the nearest cent) so the cart total equals the
 * actual charge.
 */
export const BUNDLE_PRO_CODE: Record<Interval, string> = {
  monthly: 'BUNDLEAGENTPRO_M',
  yearly: 'BUNDLEAGENTPRO_Y',
}
export const BUNDLE_PRO_BPS: Record<Interval, number> = {
  monthly: 1610,
  yearly: 1939,
}

export type AgentSelection = Partial<Record<ProductAgentType, CartTier>>

export interface CartLine {
  product: IProduct
  label: string
  quantity: number
  /** Total cents for this line (unit price × quantity). */
  amountCents: number
}

export interface CartOrder {
  baseProduct?: IProduct
  addons: { productId: string; quantity: number }[]
  discountCode?: string
  lines: CartLine[]
  subtotalCents: number
  /** Discount applied at checkout (cents). 0 when no bundle code applies. */
  discountCents: number
  /** subtotal − discount; what the customer is actually charged. */
  totalCents: number
  /** Selected agents/platforms that have no matching catalog product yet. */
  missing: string[]
}

const AGENT_ORDER: ProductAgentType[] = ['comment', 'post']
const agentLabel = (a: ProductAgentType) => (a === 'comment' ? 'Commenting' : 'Posting')
const tierLabel = (t: CartTier) => (t === 'starter' ? 'Starter' : 'Pro')

/**
 * Resolve a cart selection into a single-subscription order: one base plan (the
 * anchor agent), with the second agent and any extra platforms as add-ons.
 *
 * Existing subscribers add the second agent via the DISCOUNTED add-on variant
 * (changePlan can't take a discount code); new customers get the STANDARD variant
 * plus the whole-subscription bundle code.
 */
/** Extra connected-profile add-on counts, per agent (independent pools). */
export type ExtraProfiles = Partial<Record<ProductAgentType, number>>

export function computeCartOrder(
  catalog: PlanCatalog,
  selection: AgentSelection,
  interval: Interval,
  extraProfiles: ExtraProfiles,
  isExistingSubscriber: boolean,
  secondPlatform = false,
): CartOrder {
  const selectedAgents = AGENT_ORDER.filter((a) => selection[a])
  const missing: string[] = []
  const lines: CartLine[] = []
  const addons: { productId: string; quantity: number }[] = []

  if (selectedAgents.length === 0) {
    return { addons, lines, subtotalCents: 0, discountCents: 0, totalCents: 0, missing }
  }

  const anchorAgent = selectedAgents[0]
  const anchorTier = selection[anchorAgent]!
  const baseProduct = getPlan(catalog, anchorAgent, anchorTier, interval)

  if (!baseProduct) {
    missing.push(`${agentLabel(anchorAgent)} ${tierLabel(anchorTier)} (${interval})`)
  } else {
    lines.push({
      product: baseProduct,
      label: `${agentLabel(anchorAgent)} — ${tierLabel(anchorTier)}`,
      quantity: 1,
      amountCents: baseProduct.defaultPrice,
    })
  }

  // Second agent = the first slot of the OTHER agent. Existing subscribers add it
  // in-place via the DISCOUNTED (20% bundle) slot — changePlan can't take a code;
  // new customers get the STANDARD slot plus the whole-subscription bundle code.
  const secondAgent = selectedAgents[1]
  const variant = isExistingSubscriber ? 'discounted' : 'standard'
  if (secondAgent) {
    const secondTier = selection[secondAgent]!
    const addon = getSlot(catalog, secondAgent, secondTier, interval, variant)
    if (!addon) {
      missing.push(`${agentLabel(secondAgent)} ${tierLabel(secondTier)} add-on (${interval})`)
    } else {
      addons.push({ productId: addon._id, quantity: 1 })
      lines.push({
        product: addon,
        label: `${agentLabel(secondAgent)} — ${tierLabel(secondTier)}`,
        quantity: 1,
        amountCents: addon.defaultPrice,
      })
    }
  }

  // Extra profiles per agent: each is one more STANDARD slot of that agent at its
  // selected tier. Commenting and posting have independent profile pools. Only
  // added for agents the customer is actually subscribing to.
  const commentTier = selection.comment
  for (const agent of AGENT_ORDER) {
    const tier = selection[agent]
    const count = extraProfiles[agent] ?? 0
    if (count <= 0 || !tier) continue
    const slot = getSlot(catalog, agent, tier, interval, 'standard')
    if (!slot) {
      missing.push(
        `${agentLabel(agent)} extra profile add-on (${tierLabel(tier)}, ${interval})`,
      )
    } else {
      addons.push({ productId: slot._id, quantity: count })
      lines.push({
        product: slot,
        label: `${agentLabel(agent)} extra profiles (${tierLabel(tier)})`,
        quantity: count,
        amountCents: slot.defaultPrice * count,
      })
    }
  }

  // Second platform (e.g. X alongside LinkedIn) is just another commenting slot.
  // It uses the same 20% bundle slot as a second agent: Dodo can't scope a code
  // to an add-on, so the discount is baked into the DISCOUNTED slot's price.
  if (secondPlatform && commentTier) {
    const slot = getSlot(catalog, 'comment', commentTier, interval, 'discounted')
    if (!slot) {
      missing.push(`Second platform add-on (${tierLabel(commentTier)}, ${interval})`)
    } else {
      addons.push({ productId: slot._id, quantity: 1 })
      lines.push({
        product: slot,
        label: 'Second platform',
        quantity: 1,
        amountCents: slot.defaultPrice,
      })
    }
  }

  // Consolidate duplicate slot ids before checkout. With one unified slot family,
  // distinct cart concepts can resolve to the same product (e.g. an existing
  // subscriber adding commenting as a second agent AND a second platform both
  // map to the discounted comment slot); Dodo expects one entry per add-on id.
  const mergedAddons = Array.from(
    addons
      .reduce(
        (m, a) => m.set(a.productId, (m.get(a.productId) ?? 0) + a.quantity),
        new Map<string, number>(),
      )
      .entries(),
  ).map(([productId, quantity]) => ({ productId, quantity }))

  const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0)

  // Bundle pricing only applies to a NEW joint checkout (existing subscribers add
  // the 2nd agent via the discounted add-on variant, already priced into `lines`).
  let discountCode: string | undefined
  let discountCents = 0
  if (!isExistingSubscriber && selectedAgents.length === 2 && missing.length === 0) {
    const bothPro = selectedAgents.every((a) => selection[a] === 'pro')
    const bps = bothPro ? BUNDLE_PRO_BPS[interval] : MIXED_BUNDLE_BPS
    discountCode = bothPro ? BUNDLE_PRO_CODE[interval] : BUNDLE_DISCOUNT_CODE
    discountCents = Math.round((subtotalCents * bps) / 10000)
  }
  const totalCents = Math.max(0, subtotalCents - discountCents)

  return {
    baseProduct,
    addons: mergedAddons,
    discountCode,
    lines,
    subtotalCents,
    discountCents,
    totalCents,
    missing,
  }
}
