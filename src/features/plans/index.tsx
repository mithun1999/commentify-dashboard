'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { paymentConfig } from '@/config/payment.config'
import { Check, Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  UserSubscriptionStatus,
  type IUser,
} from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import type {
  ProductAgentType,
  ProductTier,
} from '@/features/pricing/interfaces/price.interface'
import { useGetPlans } from '@/features/pricing/query/pricing.query'
import { getCurrencySymbol } from '@/features/pricing/utils/prices.util'
import { PaymentProvider } from '../subscription/interfaces/subscription.interface'
import {
  useCreateCheckoutUrl,
  useUpdateSubscriptionPlan,
} from '../subscription/query/subscription.query'
import { computeCartOrder, type AgentSelection } from './utils/cart.util'
import {
  buildPlanCatalog,
  getPlan,
  type Interval,
} from './utils/plan-catalog.util'

const AGENTS: {
  key: ProductAgentType
  name: string
  blurb: string
}[] = [
  {
    key: 'comment',
    name: 'Commenting agent',
    blurb: 'Find and comment on relevant posts to grow reach and visibility.',
  },
  {
    key: 'post',
    name: 'Posting agent',
    blurb: 'AI content calendar that drafts, refines, and publishes posts.',
  },
]

const TIERS: { key: ProductTier; label: string }[] = [
  { key: 'starter', label: 'Starter' },
  { key: 'pro', label: 'Pro' },
]

function formatCents(cents: number, symbol: string) {
  return `${symbol}${(cents / 100).toFixed(2)}`
}

const routeApi = getRouteApi('/_authenticated/plans/')

const toCartTier = (tier?: string): ProductTier =>
  tier === 'pro' ? 'pro' : 'starter'

type PlansSearch = {
  agent?: ProductAgentType
  tier?: ProductTier
  interval?: Interval
  bundle?: boolean
}

interface CurrentPlan {
  selection: AgentSelection
  /** Extra (non-base) profiles per agent = entitlement profiles − 1. */
  extraProfiles: Record<ProductAgentType, number>
  interval: Interval
}

/** Snapshot of what the customer is subscribed to today, used to preselect the
 *  builder and to compute upgrade/downgrade against the new selection. */
function deriveCurrentPlan(user?: IUser): CurrentPlan | null {
  const agents = user?.agents
  if (!agents) return null

  const selection: AgentSelection = {}
  const extraProfiles: Record<ProductAgentType, number> = { comment: 0, post: 0 }

  if (agents.comment?.tier) {
    selection.comment = toCartTier(agents.comment.tier)
    extraProfiles.comment = Math.max(0, (agents.comment.profiles ?? 1) - 1)
  }
  if (agents.post?.tier) {
    selection.post = toCartTier(agents.post.tier)
    extraProfiles.post = Math.max(0, (agents.post.profiles ?? 1) - 1)
  }
  if (!selection.comment && !selection.post) return null

  const subInterval =
    user?.subscribedProduct?.interval ?? user?.subscription?.product?.interval
  return {
    selection,
    extraProfiles,
    interval: subInterval === 'yearly' ? 'yearly' : 'monthly',
  }
}

function buildInitialSelection(
  currentPlan: CurrentPlan | null,
  search: PlansSearch,
): AgentSelection {
  const initial: AgentSelection = currentPlan ? { ...currentPlan.selection } : {}
  // The "Power Bundle" deep-link preselects both agents (Pro, matching the
  // marketing $109/$87 framing) so the bundle discount shows immediately.
  if (search.bundle) {
    initial.comment = toCartTier(search.tier ?? 'pro')
    initial.post = toCartTier(search.tier ?? 'pro')
  }
  // A deep link (from marketing) overrides/adds the requested agent + tier.
  if (search.agent) {
    initial[search.agent] = toCartTier(search.tier)
  }
  // Fall back to a sensible default when nothing is selected.
  if (!initial.comment && !initial.post) {
    initial.comment = 'starter'
  }
  return initial
}

type PlanChange = 'upgrade' | 'downgrade' | 'change' | 'current'

const TIER_RANK: Record<ProductTier, number> = { starter: 1, pro: 2 }

/** Rough ordinal weight for an agent so we can call a change up vs down. */
function agentWeight(tier: ProductTier | undefined, profiles: number): number {
  if (!tier) return 0
  return TIER_RANK[tier] * 1000 + profiles
}

const CHANGE_BADGE: Record<
  Exclude<PlanChange, 'current'>,
  { label: string; className: string }
> = {
  upgrade: { label: 'Upgrade', className: 'border-emerald-500/30 text-emerald-600' },
  downgrade: { label: 'Downgrade', className: 'border-amber-500/30 text-amber-600' },
  change: { label: 'Plan change', className: 'border-blue-500/30 text-blue-600' },
}

export default function Plans() {
  const { data: user } = useGetUserQuery()
  const { data: plans, isLoading } = useGetPlans()
  const search = routeApi.useSearch()

  // One subscription per customer: anyone who already holds a non-cancelled
  // subscription (active OR still in trial) changes it in place via changePlan,
  // rather than checking out a second one.
  const isExistingSubscriber =
    Boolean(user?.subscription) &&
    !user?.subscription?.isCancelled &&
    (user?.status === UserSubscriptionStatus.ACTIVE ||
      user?.status === UserSubscriptionStatus.IN_TRIAL)

  const currentPlan = useMemo(() => deriveCurrentPlan(user), [user])

  const [interval, setInterval] = useState<Interval>(
    search.interval ?? currentPlan?.interval ?? 'monthly',
  )
  const [selection, setSelection] = useState<AgentSelection>(() =>
    buildInitialSelection(currentPlan, search),
  )
  const [extraProfiles, setExtraProfiles] = useState<
    Record<ProductAgentType, number>
  >(() => ({ ...(currentPlan?.extraProfiles ?? { comment: 0, post: 0 }) }))

  // The user query can resolve after first paint; seed the current plan once it
  // arrives. Runs at most once, and never after the customer edits anything (or
  // follows a deep link) so we never clobber an in-progress selection.
  const seededRef = useRef(false)
  const interactedRef = useRef(false)
  useEffect(() => {
    if (seededRef.current || interactedRef.current || !currentPlan) return
    if (search.agent || search.bundle) return
    seededRef.current = true
    setSelection({ ...currentPlan.selection })
    setExtraProfiles({ ...currentPlan.extraProfiles })
    setInterval(currentPlan.interval)
  }, [currentPlan, search])

  const catalog = useMemo(
    () => buildPlanCatalog(Array.isArray(plans) ? plans : []),
    [plans],
  )

  const planChange: PlanChange = useMemo(() => {
    if (!currentPlan) return 'current'
    const agentKeys: ProductAgentType[] = ['comment', 'post']
    let cur = 0
    let next = 0
    for (const a of agentKeys) {
      const curTier = currentPlan.selection[a]
      cur += agentWeight(curTier, (currentPlan.extraProfiles[a] ?? 0) + (curTier ? 1 : 0))
      const nextTier = selection[a]
      next += agentWeight(nextTier, (extraProfiles[a] ?? 0) + (nextTier ? 1 : 0))
    }
    if (next > cur) return 'upgrade'
    if (next < cur) return 'downgrade'
    const sameSelection = agentKeys.every(
      (a) => selection[a] === currentPlan.selection[a],
    )
    const sameExtras = agentKeys.every(
      (a) => (extraProfiles[a] ?? 0) === (currentPlan.extraProfiles[a] ?? 0),
    )
    if (sameSelection && sameExtras && interval === currentPlan.interval)
      return 'current'
    return 'change'
  }, [currentPlan, selection, extraProfiles, interval])

  const order = useMemo(
    () =>
      computeCartOrder(
        catalog,
        selection,
        interval,
        extraProfiles,
        isExistingSubscriber,
      ),
    [catalog, selection, interval, extraProfiles, isExistingSubscriber],
  )

  const currency = order.lines[0]?.product.currency ?? 'usd'
  const symbol = getCurrencySymbol(currency)

  const handleCheckoutUrl = (url: string) => {
    const provider = paymentConfig.defaultPaymentProvider as PaymentProvider
    if (provider === 'dodo_payments') window.location.href = url
    else {
      try {
        window.LemonSqueezy.Url.Open(url)
      } catch {
        toast.error('Checkout url is not valid')
      }
    }
  }

  const { createCheckoutUrl, isCreatingCheckoutUrl } = useCreateCheckoutUrl({
    cb: handleCheckoutUrl,
  })
  const { updateSubscriptionPlan, isUpdatingSubscriptionPlan } =
    useUpdateSubscriptionPlan()

  const isSubmitting = isCreatingCheckoutUrl || isUpdatingSubscriptionPlan

  const toggleAgent = (agent: ProductAgentType) => {
    interactedRef.current = true
    const wasSelected = !!selection[agent]
    setSelection((prev) => {
      const next = { ...prev }
      if (next[agent]) delete next[agent]
      else next[agent] = 'starter'
      return next
    })
    // Extra profiles are scoped per agent; clear this agent's count when removed.
    if (wasSelected) setExtraProfiles((p) => ({ ...p, [agent]: 0 }))
  }

  const setTier = (agent: ProductAgentType, tier: ProductTier) => {
    interactedRef.current = true
    setSelection((prev) => ({ ...prev, [agent]: tier }))
  }

  const changeExtraProfiles = (agent: ProductAgentType, delta: number) => {
    interactedRef.current = true
    setExtraProfiles((p) => ({
      ...p,
      [agent]: Math.max(0, (p[agent] ?? 0) + delta),
    }))
  }

  const changeInterval = (next: Interval) => {
    interactedRef.current = true
    setInterval(next)
  }

  const tierPrice = (agent: ProductAgentType, tier: ProductTier) => {
    const plan = getPlan(catalog, agent, tier, interval)
    return plan ? formatCents(plan.defaultPrice, getCurrencySymbol(plan.currency)) : null
  }

  const noChangeForSubscriber = isExistingSubscriber && planChange === 'current'
  const canCheckout =
    !!order.baseProduct &&
    order.missing.length === 0 &&
    !isSubmitting &&
    !noChangeForSubscriber

  const summaryTitle = currentPlan ? 'Your subscription' : 'Order summary'
  const ctaLabel = !isExistingSubscriber
    ? 'Continue to checkout'
    : planChange === 'upgrade'
      ? 'Upgrade subscription'
      : planChange === 'downgrade'
        ? 'Downgrade subscription'
        : planChange === 'change'
          ? 'Update subscription'
          : 'Your current plan'
  const changeBadge =
    currentPlan && planChange !== 'current' ? CHANGE_BADGE[planChange] : null

  const handleSubmit = () => {
    if (!order.baseProduct) return
    const provider = paymentConfig.defaultPaymentProvider as PaymentProvider
    if (isExistingSubscriber) {
      updateSubscriptionPlan({
        productId: order.baseProduct._id,
        addons: order.addons,
      })
    } else {
      createCheckoutUrl({
        productId: order.baseProduct._id,
        provider,
        embed: false,
        addons: order.addons,
        discountCode: order.discountCode,
      })
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader />
        <Main>
          <div className='mx-auto mt-16 flex max-w-md flex-col items-center gap-4'>
            <h2 className='text-lg font-semibold'>Loading plans…</h2>
            <Loader2 className='text-primary h-6 w-6 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader />
      <Main>
        <div className='py-8'>
          <div className='flex flex-col items-center gap-2 text-center'>
            <h1 className='text-3xl font-semibold'>Build your plan</h1>
            <p className='text-muted-foreground'>
              Pick the agents you need. One subscription, billed together.
            </p>
            <div className='mt-3 flex items-center gap-3 text-sm'>
              <span className={cn(interval === 'monthly' && 'font-semibold')}>
                Monthly
              </span>
              <Switch
                checked={interval === 'yearly'}
                onCheckedChange={(v) => changeInterval(v ? 'yearly' : 'monthly')}
              />
              <span className={cn(interval === 'yearly' && 'font-semibold')}>
                Yearly
              </span>
              <Badge variant='secondary'>2 months free</Badge>
            </div>
          </div>

          <div className='mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]'>
            <div className='flex flex-col gap-5'>
              {AGENTS.map((agent) => {
                const selected = !!selection[agent.key]
                return (
                  <Card
                    key={agent.key}
                    className={cn(
                      'transition-colors',
                      selected && 'border-primary',
                    )}
                  >
                    <CardContent className='p-5'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <h3 className='font-semibold'>{agent.name}</h3>
                          <p className='text-muted-foreground text-sm'>
                            {agent.blurb}
                          </p>
                        </div>
                        <Switch
                          checked={selected}
                          onCheckedChange={() => toggleAgent(agent.key)}
                        />
                      </div>

                      {selected && (
                        <div className='mt-4 grid grid-cols-2 gap-3'>
                          {TIERS.map((tier) => {
                            const active = selection[agent.key] === tier.key
                            const price = tierPrice(agent.key, tier.key)
                            return (
                              <button
                                key={tier.key}
                                type='button'
                                onClick={() => setTier(agent.key, tier.key)}
                                className={cn(
                                  'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                                  active
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:border-muted-foreground/40',
                                )}
                              >
                                <span className='flex w-full items-center justify-between font-medium'>
                                  {tier.label}
                                  {active && (
                                    <Check className='text-primary h-4 w-4' />
                                  )}
                                </span>
                                <span className='text-muted-foreground text-sm'>
                                  {price ?? 'Unavailable'}
                                  {price && (
                                    <span className='text-xs'>
                                      /{interval === 'monthly' ? 'mo' : 'yr'}
                                    </span>
                                  )}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              {AGENTS.filter((a) => selection[a.key]).map((agent) => {
                const tier = selection[agent.key]!
                const count = extraProfiles[agent.key] ?? 0
                const noun = agent.key === 'comment' ? 'commenting' : 'posting'
                return (
                  <Card key={agent.key}>
                    <CardContent className='flex items-center justify-between p-5'>
                      <div>
                        <h3 className='font-semibold'>
                          Extra {noun} profiles
                        </h3>
                        <p className='text-muted-foreground text-sm'>
                          Run your {noun} agent on more profiles. Priced at your{' '}
                          {tier === 'pro' ? 'Pro' : 'Starter'} tier.
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <Button
                          variant='outline'
                          size='icon'
                          disabled={count <= 0}
                          onClick={() => changeExtraProfiles(agent.key, -1)}
                        >
                          <Minus className='h-4 w-4' />
                        </Button>
                        <span className='w-6 text-center font-medium'>
                          {count}
                        </span>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => changeExtraProfiles(agent.key, 1)}
                        >
                          <Plus className='h-4 w-4' />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Card className='h-fit'>
              <CardContent className='p-5'>
                <div className='flex items-center justify-between gap-2'>
                  <h3 className='font-semibold'>{summaryTitle}</h3>
                  {changeBadge && (
                    <Badge variant='outline' className={changeBadge.className}>
                      {changeBadge.label}
                    </Badge>
                  )}
                </div>
                <Separator className='my-4' />
                {order.lines.length === 0 ? (
                  <p className='text-muted-foreground text-sm'>
                    Select at least one agent to continue.
                  </p>
                ) : (
                  <div className='flex flex-col gap-3'>
                    {order.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className='flex items-center justify-between text-sm'
                      >
                        <span>
                          {line.label}
                          {line.quantity > 1 && ` × ${line.quantity}`}
                        </span>
                        <span>{formatCents(line.amountCents, symbol)}</span>
                      </div>
                    ))}
                    <Separator className='my-1' />
                    {order.discountCents > 0 ? (
                      <>
                        <div className='flex items-center justify-between text-sm'>
                          <span>Subtotal</span>
                          <span>{formatCents(order.subtotalCents, symbol)}</span>
                        </div>
                        <div className='flex items-center justify-between text-sm text-emerald-600'>
                          <span>Bundle discount</span>
                          <span>-{formatCents(order.discountCents, symbol)}</span>
                        </div>
                        <div className='flex items-center justify-between font-semibold'>
                          <span>Total</span>
                          <span>{formatCents(order.totalCents, symbol)}</span>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          Bundle discount applied at checkout (code {order.discountCode}).
                        </p>
                      </>
                    ) : (
                      <div className='flex items-center justify-between font-semibold'>
                        <span>Subtotal</span>
                        <span>{formatCents(order.subtotalCents, symbol)}</span>
                      </div>
                    )}
                  </div>
                )}

                {order.missing.length > 0 && (
                  <p className='text-destructive mt-4 text-sm'>
                    Not yet available: {order.missing.join(', ')}.
                  </p>
                )}

                <LoadingButton
                  className='mt-5 w-full'
                  loading={isSubmitting}
                  disabled={!canCheckout}
                  onClick={handleSubmit}
                >
                  {ctaLabel}
                </LoadingButton>

                {noChangeForSubscriber && order.lines.length > 0 && (
                  <p className='text-muted-foreground mt-2 text-center text-xs'>
                    This is your current plan. Adjust an agent, tier, or profiles
                    to make a change.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}

function PageHeader() {
  return (
    <Header fixed>
      <div className='ml-auto flex items-center space-x-4'>
        <ThemeSwitch />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
