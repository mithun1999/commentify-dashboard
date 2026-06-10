'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Linkedin,
  Loader2,
  MessageSquare,
  PenLine,
  Shield,
  Twitter,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { paymentConfig } from '@/config/payment.config'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Switch } from '@/components/ui/switch'
import {
  UserSubscriptionStatus,
  type PlanTier,
} from '@/features/auth/interface/user.interface'
import { useGetUserQuery, UserQueryEnum } from '@/features/auth/query/user.query'
import type { PaymentProvider } from '@/features/subscription/interfaces/subscription.interface'
import {
  useCreateCheckoutUrl,
  useUpdateSubscriptionPlan,
} from '@/features/subscription/query/subscription.query'
import { verifyCheckout } from '@/features/subscription/api/subscription.api'
import { useGetPlans } from '@/features/pricing/query/pricing.query'
import type {
  ProductAgentType,
  ProductTier,
} from '@/features/pricing/interfaces/price.interface'
import { getCurrencySymbol } from '@/features/pricing/utils/prices.util'
import {
  buildPlanCatalog,
  getPlan,
  getSlot,
  type Interval,
} from '@/features/plans/utils/plan-catalog.util'
import {
  computeCartOrder,
  type AgentSelection,
} from '@/features/plans/utils/cart.util'
import {
  useOnboarding,
  type OnboardingPlatform,
} from '@/stores/onboarding.store'
import { OnboardingCard } from '../onboarding-card'
import { useTrackStepView } from '../hooks/useTrackStepView'

const activateTrialRoute = getRouteApi('/onboarding/activate-trial')

type CheckoutState = 'selecting' | 'processing' | 'success' | 'failed'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10000

const AGENTS: {
  key: ProductAgentType
  name: string
  blurb: string
  icon: LucideIcon
}[] = [
  {
    key: 'comment',
    name: 'Commenting agent',
    blurb: 'Find and comment on relevant posts to grow reach and visibility.',
    icon: MessageSquare,
  },
  {
    key: 'post',
    name: 'Posting agent',
    blurb: 'AI content calendar that drafts, refines, and publishes posts.',
    icon: PenLine,
  },
]

const TIERS: { key: ProductTier; label: string }[] = [
  { key: 'starter', label: 'Starter' },
  { key: 'pro', label: 'Pro' },
]

type TierCopy = { blurb: string; popular?: boolean; features: string[] }

// What each plan unlocks, shown per tier so a new user can compare before they
// commit. Mirrors the marketing site's canonical copy (commentify-nextjs-website
// AGENT_PRICING) — keep the two in sync. Prices still come from the live catalog.
const PLAN_FEATURES: Record<ProductAgentType, Record<ProductTier, TierCopy>> = {
  comment: {
    starter: {
      blurb: 'One agent, commenting on autopilot.',
      features: [
        '1 commenting agent (LinkedIn or X)',
        'Up to 50 posts analyzed per day',
        'AI comments generated in your voice',
        'Personal Branding + Sales modes',
        'Smart queue — review, edit, approve',
      ],
    },
    pro: {
      blurb: 'Scale across profiles & geographies.',
      popular: true,
      features: [
        'Everything in Starter, plus:',
        'Up to 100 posts analyzed per day',
        'Monitor up to 10 specific profiles',
        'Advanced targeting — geography & engagement',
        'Tag original author in comments',
        'Growth analytics dashboard',
        'Priority support',
      ],
    },
  },
  post: {
    starter: {
      blurb: 'Your content calendar, on autopilot.',
      features: [
        '1 posting agent (LinkedIn)',
        '3 posts per week',
        'AI drafts written in your voice',
        'AI-generated images per post',
        'Review, edit, schedule, or auto-publish',
      ],
    },
    pro: {
      blurb: 'Publish more, sourced from the best.',
      popular: true,
      features: [
        'Everything in Starter, plus:',
        '5 posts per week',
        'Track up to 15 creators for inspiration',
        'AI carousels',
        'Priority support',
      ],
    },
  },
}

const TRIAL_DAYS = 5

const PLATFORM_META: Record<
  OnboardingPlatform,
  { label: string; Icon: LucideIcon }
> = {
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
  twitter: { label: 'X (Twitter)', Icon: Twitter },
}

const toCartTier = (tier?: PlanTier | string): ProductTier =>
  tier === 'pro' || tier === 'premium' ? 'pro' : 'starter'

function formatCents(cents: number, symbol: string) {
  return `${symbol}${(cents / 100).toFixed(2)}`
}

function useCheckoutReturn() {
  const { status, subscription_id } = activateTrialRoute.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const verifyCalledRef = useRef(false)

  const hasCheckoutParams = Boolean(status)
  const isFailed = status === 'failed' || status === 'cancelled'

  const [checkoutState, setCheckoutState] = useState<CheckoutState>(() => {
    if (!hasCheckoutParams) return 'selecting'
    if (isFailed) return 'failed'
    return 'processing'
  })
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (hasCheckoutParams && posthog) {
      posthog.capture('onboarding_checkout_returned', {
        status,
        subscription_id,
        is_failed: isFailed,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (checkoutState !== 'processing') return
    if (verifyCalledRef.current) return

    if (user?.status !== UserSubscriptionStatus.PENDING) {
      setCheckoutState('success')
      posthog?.capture('onboarding_trial_activated', { source: 'immediate' })
      setTimeout(() => navigate({ to: '/' }), 1500)
      return
    }

    verifyCalledRef.current = true

    const run = async () => {
      if (subscription_id) {
        try {
          await verifyCheckout(subscription_id)
          posthog?.capture('onboarding_checkout_verify_success', { subscription_id })
        } catch {
          posthog?.capture('onboarding_checkout_verify_failed', { subscription_id })
        }
        await queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
      }

      startTimeRef.current = Date.now()
      pollRef.current = setInterval(async () => {
        if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
          setTimedOut(true)
          if (pollRef.current) clearInterval(pollRef.current)
          return
        }
        await queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
      }, POLL_INTERVAL_MS)
    }

    run()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [checkoutState, user?.status, navigate, queryClient, subscription_id, posthog])

  useEffect(() => {
    if (
      checkoutState === 'processing' &&
      user?.status &&
      user.status !== UserSubscriptionStatus.PENDING
    ) {
      setCheckoutState('success')
      if (pollRef.current) clearInterval(pollRef.current)
      posthog?.capture('onboarding_trial_activated', {
        source: 'polling',
        elapsed_ms: Date.now() - startTimeRef.current,
      })
      setTimeout(() => navigate({ to: '/' }), 1500)
    }
  }, [user?.status, checkoutState, navigate, posthog])

  const retryCheckout = () => {
    posthog?.capture('onboarding_checkout_retry_clicked')
    navigate({
      to: '/onboarding/activate-trial',
      search: {},
      replace: true,
    })
    setCheckoutState('selecting')
    verifyCalledRef.current = false
  }

  return { checkoutState, timedOut, retryCheckout }
}

export function ActivateTrialStep() {
  useTrackStepView('activate-trial')
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { data: user } = useGetUserQuery()
  const { data: plans, isLoading: isFetchingPlans } = useGetPlans()
  const { data: onboardingData } = useOnboarding()
  const { checkoutState, timedOut, retryCheckout } = useCheckoutReturn()

  const [interval, setBillingInterval] = useState<Interval>('monthly')
  const [selection, setSelection] = useState<AgentSelection>(() => {
    const initial: AgentSelection = {}
    for (const cap of onboardingData.selectedCapabilities ?? []) {
      if (cap === 'comment' || cap === 'post') initial[cap] = 'pro'
    }
    // Resuming subscribers: seed from existing entitlements.
    if (user?.agents?.comment?.tier) initial.comment = toCartTier(user.agents.comment.tier)
    if (user?.agents?.post?.tier) initial.post = toCartTier(user.agents.post.tier)
    if (!initial.comment && !initial.post) {
      const slug = onboardingData.selectedAgentType ?? ''
      if (slug.includes('post')) initial.post = 'pro'
      else initial.comment = 'pro'
    }
    return initial
  })
  // Opt-in: run the commenting agent on a second platform (e.g. X alongside
  // LinkedIn) as a 20%-off bundle slot on the same subscription.
  const [secondPlatform, setSecondPlatform] = useState(false)

  const catalog = useMemo(
    () => buildPlanCatalog(Array.isArray(plans) ? plans : []),
    [plans]
  )

  const isExistingSubscriber =
    user?.status === UserSubscriptionStatus.ACTIVE && Boolean(user?.subscription)

  // Extra profiles are added later from the dashboard, so the cart carries the
  // agent plan(s) plus the optional second-platform add-on (passing 0 for the
  // extra-profile quantity keeps that path untouched here).
  const order = useMemo(
    () =>
      computeCartOrder(
        catalog,
        selection,
        interval,
        {},
        isExistingSubscriber,
        secondPlatform && !!selection.comment
      ),
    [catalog, selection, interval, isExistingSubscriber, secondPlatform]
  )

  const currency = order.lines[0]?.product.currency ?? 'usd'
  const symbol = getCurrencySymbol(currency)

  const handleCheckoutUrl = (url: string) => {
    const provider = paymentConfig.defaultPaymentProvider as PaymentProvider
    if (provider === 'lemon_squeezy') {
      try {
        window.LemonSqueezy.Url.Open(url)
      } catch {
        toast.error('Checkout url is not valid')
      }
    } else {
      window.location.href = url
    }
  }

  const { createCheckoutUrl, isCreatingCheckoutUrl } = useCreateCheckoutUrl({
    cb: handleCheckoutUrl,
  })
  const { updateSubscriptionPlan, isUpdatingSubscriptionPlan } =
    useUpdateSubscriptionPlan()

  const isSubmitting = isCreatingCheckoutUrl || isUpdatingSubscriptionPlan
  const canCheckout =
    !!order.baseProduct && order.missing.length === 0 && !isSubmitting

  const toggleAgent = (agent: ProductAgentType) => {
    setSelection((prev) => {
      const next = { ...prev }
      if (next[agent]) delete next[agent]
      else next[agent] = 'pro'
      return next
    })
    // The second platform is a commenting add-on; drop it if commenting is off.
    if (agent === 'comment' && selection.comment) setSecondPlatform(false)
  }

  const setTier = (agent: ProductAgentType, tier: ProductTier) => {
    setSelection((prev) => ({ ...prev, [agent]: tier }))
  }

  // Always present a clean monthly figure: yearly plans show their per-month
  // equivalent so the cards read "$X/mo" regardless of the billing interval.
  const monthlyCents = (agent: ProductAgentType, tier: ProductTier) => {
    const plan = getPlan(catalog, agent, tier, interval)
    if (!plan) return null
    return interval === 'yearly'
      ? Math.round(plan.defaultPrice / 12)
      : plan.defaultPrice
  }
  const perMo = (cents: number) =>
    interval === 'yearly' ? Math.round(cents / 12) : cents

  const handleSubmit = () => {
    if (!order.baseProduct) return
    const provider = paymentConfig.defaultPaymentProvider as PaymentProvider
    posthog?.capture('onboarding_checkout_started', {
      base_product_id: order.baseProduct._id,
      addon_ids: order.addons.map((a) => a.productId),
      interval,
      is_bundle: !!order.discountCode,
      agents: Object.keys(selection),
    })
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

  if (user?.status && user.status !== UserSubscriptionStatus.PENDING) {
    if (checkoutState !== 'success' && !isExistingSubscriber) {
      navigate({ to: '/' })
    }
  }

  const connectedPlatform: OnboardingPlatform =
    onboardingData.selectedPlatform ?? 'linkedin'
  const secondPlatformType: OnboardingPlatform =
    connectedPlatform === 'linkedin' ? 'twitter' : 'linkedin'
  const selectedAgentKeys = AGENTS.map((a) => a.key).filter((k) => selection[k])
  const secondAgent = selectedAgentKeys[1]
  const hasBundle = order.discountCents > 0
  const agentTitle = (a: ProductAgentType, t: ProductTier) =>
    `${t === 'pro' ? 'Pro' : 'Starter'} ${a === 'comment' ? 'Comment' : 'Post'} Agent`

  // The bundle (20% off) commenting slot, sized to the commenting tier — a second
  // platform is just another commenting instance. Only available once
  // provisioned; falls back to an informational row otherwise.
  const secondPlatformProduct = selection.comment
    ? getSlot(catalog, 'comment', selection.comment, interval, 'discounted')
    : undefined
  const secondPlatformStdProduct = selection.comment
    ? getSlot(catalog, 'comment', selection.comment, interval, 'standard')
    : undefined

  const platformRow = (platform: OnboardingPlatform, connected: boolean) => {
    const meta = PLATFORM_META[platform]
    const PlatformIcon = meta.Icon
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border p-3',
          connected ? 'border-border' : 'border-dashed'
        )}
      >
        <span className='bg-muted text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
          <PlatformIcon className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium'>{meta.label}</p>
          <p className='text-muted-foreground text-[11px] tracking-wide uppercase'>
            {connected ? 'Connected in setup' : 'Connect later from your dashboard'}
          </p>
        </div>
        {connected ? (
          <Check className='text-primary h-4 w-4' />
        ) : (
          <span className='text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase'>
            Later
          </span>
        )}
      </div>
    )
  }

  const renderSecondPlatform = () => {
    if (!secondPlatformProduct) return platformRow(secondPlatformType, false)
    const meta = PLATFORM_META[secondPlatformType]
    const PlatformIcon = meta.Icon
    const price = perMo(secondPlatformProduct.defaultPrice)
    const stdPrice = secondPlatformStdProduct
      ? perMo(secondPlatformStdProduct.defaultPrice)
      : null
    return (
      <button
        type='button'
        aria-pressed={secondPlatform}
        onClick={() => setSecondPlatform((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
          secondPlatform
            ? 'border-primary bg-primary/5'
            : 'hover:border-muted-foreground/40 border-dashed'
        )}
      >
        <span className='bg-muted text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
          <PlatformIcon className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium'>
            {meta.label}
            <span className='text-muted-foreground ml-1.5 text-[11px] font-normal'>
              · 2nd platform
            </span>
          </p>
          <p className='mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px]'>
            <span className='text-foreground font-semibold'>
              {formatCents(price, symbol)}/mo
            </span>
            {stdPrice && stdPrice !== price && (
              <span className='text-muted-foreground line-through'>
                {formatCents(stdPrice, symbol)}
              </span>
            )}
            <span className='text-primary font-semibold'>20% off</span>
          </p>
        </div>
        <span
          className={cn(
            'flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase',
            secondPlatform
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground border'
          )}
        >
          {secondPlatform ? (
            <>
              <Check className='h-3 w-3' /> Added
            </>
          ) : (
            'Add'
          )}
        </span>
      </button>
    )
  }

  if (checkoutState === 'processing') {
    return (
      <OnboardingCard title='Activating your trial...' className='max-w-md'>
        <div className='flex flex-col items-center gap-4 py-8'>
          {timedOut ? (
            <>
              <CheckCircle2 className='h-12 w-12 text-green-500' />
              <p className='text-foreground text-center font-medium'>
                Your payment was successful!
              </p>
              <p className='text-muted-foreground text-center text-sm'>
                Account activation is taking a bit longer than usual. You can close this page and your account will be ready shortly.
              </p>
              <Button onClick={() => navigate({ to: '/' })} className='mt-2'>
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <Loader2 className='text-primary h-12 w-12 animate-spin' />
              <p className='text-foreground text-center font-medium'>
                Setting up your account...
              </p>
              <p className='text-muted-foreground text-center text-sm'>
                This usually takes just a few seconds. Please don't close this page.
              </p>
            </>
          )}
        </div>
      </OnboardingCard>
    )
  }

  if (checkoutState === 'success') {
    return (
      <OnboardingCard title='Welcome aboard!' className='max-w-md'>
        <div className='flex flex-col items-center gap-4 py-8'>
          <CheckCircle2 className='h-12 w-12 text-green-500' />
          <p className='text-foreground text-center font-medium'>
            Your free trial is now active!
          </p>
          <p className='text-muted-foreground text-center text-sm'>
            Redirecting you to the dashboard...
          </p>
        </div>
      </OnboardingCard>
    )
  }

  if (checkoutState === 'failed') {
    return (
      <OnboardingCard title='Payment unsuccessful' className='max-w-md'>
        <div className='flex flex-col items-center gap-4 py-8'>
          <XCircle className='h-12 w-12 text-red-500' />
          <p className='text-foreground text-center font-medium'>
            We couldn't process your payment
          </p>
          <p className='text-muted-foreground text-center text-sm'>
            No charges were made. Please try again with a different payment method.
          </p>
          <Button onClick={retryCheckout} className='mt-2'>
            Try Again
          </Button>
        </div>
      </OnboardingCard>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <button
          type='button'
          onClick={() => navigate({ to: '/onboarding/identity' })}
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase transition-colors'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          From your setup
        </button>
        <div className='flex items-center gap-3'>
          <div className='bg-muted/50 inline-flex items-center rounded-full border p-1'>
            {(['monthly', 'yearly'] as Interval[]).map((opt) => (
              <button
                key={opt}
                type='button'
                onClick={() => setBillingInterval(opt)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  interval === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
          <span className='border-primary/40 text-primary rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase'>
            Save 20%
          </span>
        </div>
      </div>

      <div className='border-border bg-card flex items-start gap-3 rounded-2xl border p-4'>
        <Shield className='text-primary mt-0.5 h-5 w-5 flex-shrink-0' />
        <div className='text-sm'>
          <p className='text-foreground font-medium'>100% risk-free trial</p>
          <p className='text-muted-foreground'>
            No charge for {TRIAL_DAYS} days. We'll remind you 2 days before it
            ends — cancel in one click, no questions asked.
          </p>
        </div>
      </div>

      {isFetchingPlans ? (
        <div className='flex items-center justify-center py-12'>
          <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
        </div>
      ) : (
        <div className='grid items-start gap-6 lg:grid-cols-[1fr_minmax(300px,340px)]'>
          <div className='flex flex-col gap-5'>
            {AGENTS.map((agent) => {
              const selected = !!selection[agent.key]
              const Icon = agent.icon
              const activeTier = selection[agent.key] ?? 'pro'
              const headerCents = monthlyCents(agent.key, activeTier)
              const isSecond = secondAgent === agent.key && hasBundle
              const copy = PLAN_FEATURES[agent.key][activeTier]
              return (
                <section
                  key={agent.key}
                  className={cn(
                    'rounded-2xl border p-5 transition-colors sm:p-6',
                    selected
                      ? 'border-primary bg-primary/[0.03]'
                      : 'border-border bg-card'
                  )}
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex items-start gap-3'>
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                          selected
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className='h-5 w-5' />
                      </span>
                      <div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h3 className='font-semibold'>{agent.name}</h3>
                          {isSecond && (
                            <span className='bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                              2nd agent −20%
                            </span>
                          )}
                        </div>
                        <p className='text-muted-foreground mt-0.5 text-sm'>
                          {agent.blurb}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      {selected && headerCents != null && (
                        <div className='whitespace-nowrap text-right'>
                          <span className='text-xl font-bold'>
                            {formatCents(headerCents, symbol)}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            /mo
                          </span>
                        </div>
                      )}
                      <Switch
                        checked={selected}
                        onCheckedChange={() => toggleAgent(agent.key)}
                        aria-label={`Enable ${agent.name}`}
                      />
                    </div>
                  </div>

                  {selected && (
                    <div className='mt-5 grid gap-6 md:grid-cols-2'>
                      <div>
                        <p className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
                          Plan
                        </p>
                        <div
                          role='radiogroup'
                          aria-label={`${agent.name} plan`}
                          className='bg-muted/40 mt-2 inline-flex rounded-full border p-1'
                        >
                          {TIERS.map((tier) => {
                            const active = selection[agent.key] === tier.key
                            const cents = monthlyCents(agent.key, tier.key)
                            return (
                              <button
                                key={tier.key}
                                type='button'
                                role='radio'
                                aria-checked={active}
                                onClick={() => setTier(agent.key, tier.key)}
                                className={cn(
                                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                                  active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {tier.label}
                                {cents != null &&
                                  ` · ${formatCents(cents, symbol)}`}
                              </button>
                            )
                          })}
                        </div>
                        <ul className='mt-4 space-y-2'>
                          {copy.features.map((feat, i) =>
                            /^everything in/i.test(feat) ? (
                              <li
                                key={i}
                                className='text-foreground pt-1 text-xs font-semibold'
                              >
                                {feat}
                              </li>
                            ) : (
                              <li
                                key={i}
                                className='flex items-start gap-2 text-sm'
                              >
                                <Check className='text-primary mt-0.5 h-4 w-4 flex-shrink-0' />
                                <span className='text-muted-foreground'>
                                  {feat}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <div className='flex items-center justify-between'>
                          <p className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
                            {agent.key === 'comment'
                              ? 'Platforms'
                              : 'Publishes to'}
                          </p>
                          <span className='text-muted-foreground text-[11px] tracking-wide uppercase'>
                            From your setup
                          </span>
                        </div>
                        <div className='mt-2 space-y-2'>
                          {agent.key === 'comment' ? (
                            <>
                              {platformRow(connectedPlatform, true)}
                              {renderSecondPlatform()}
                            </>
                          ) : (
                            platformRow('linkedin', true)
                          )}
                        </div>
                        {agent.key === 'post' && (
                          <div className='border-border bg-muted/30 mt-3 rounded-xl border p-3'>
                            <p className='text-primary text-[11px] font-semibold tracking-wide uppercase'>
                              Good to know
                            </p>
                            <p className='text-muted-foreground mt-1 text-xs'>
                              Your plan includes a monthly generation allowance
                              that resets each cycle. Running low? Top up anytime
                              from your dashboard — packs carry forward and never
                              expire.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <aside className='border-border bg-card h-fit rounded-2xl border p-5 sm:p-6 lg:sticky lg:top-6'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='font-semibold'>Your subscription</h3>
              {hasBundle && (
                <span className='bg-primary/15 text-primary rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase'>
                  Bundle · 20% off
                </span>
              )}
            </div>
            <div className='bg-border my-4 h-px' />

            {order.lines.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Select at least one agent to continue.
              </p>
            ) : (
              <div className='space-y-4'>
                {order.lines.map((line, idx) => {
                  const a = line.product.agentType
                  const t = (line.product.tier ?? 'starter') as ProductTier
                  const isPlatform = line.label === 'Second platform'
                  const title = isPlatform
                    ? 'Second platform'
                    : a
                      ? agentTitle(a, t)
                      : line.label
                  const subtitle = isPlatform
                    ? `${PLATFORM_META[secondPlatformType].label} · 20% off`
                    : a === 'comment'
                      ? `on ${PLATFORM_META[connectedPlatform].label} · connected`
                      : a === 'post'
                        ? 'Drafts & publishes for you'
                        : undefined
                  return (
                    <div
                      key={idx}
                      className='flex items-start justify-between gap-3'
                    >
                      <div>
                        <p className='text-sm font-medium'>{title}</p>
                        {subtitle && (
                          <p className='text-muted-foreground text-xs'>
                            {subtitle}
                          </p>
                        )}
                      </div>
                      <p className='whitespace-nowrap text-sm font-medium'>
                        {formatCents(perMo(line.amountCents), symbol)}
                        <span className='text-muted-foreground'>/mo</span>
                      </p>
                    </div>
                  )
                })}
                {hasBundle && (
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-primary text-sm'>
                      Bundle discount (2nd agent −20%)
                    </p>
                    <p className='text-primary whitespace-nowrap text-sm font-medium'>
                      −{formatCents(perMo(order.discountCents), symbol)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {order.missing.length > 0 && (
              <p className='text-destructive mt-4 text-sm'>
                Not yet available: {order.missing.join(', ')}.
              </p>
            )}

            <div className='bg-border my-5 h-px' />

            {isExistingSubscriber ? (
              <div className='flex items-baseline justify-between'>
                <span className='text-sm font-semibold'>New total</span>
                <span className='text-2xl font-bold'>
                  {formatCents(perMo(order.totalCents), symbol)}
                  <span className='text-muted-foreground text-sm font-normal'>
                    /mo
                  </span>
                </span>
              </div>
            ) : (
              <>
                <div className='flex items-baseline justify-between'>
                  <span className='text-sm font-semibold'>Due today</span>
                  <span className='text-3xl font-bold'>
                    {formatCents(0, symbol)}
                  </span>
                </div>
                {order.totalCents > 0 && (
                  <p className='text-muted-foreground mt-1 text-xs'>
                    After your {TRIAL_DAYS}-day trial:{' '}
                    {formatCents(perMo(order.totalCents), symbol)}/mo
                    {interval === 'yearly' ? ', billed annually' : ''}.
                  </p>
                )}
              </>
            )}

            <LoadingButton
              size='lg'
              className='mt-5 w-full'
              loading={isSubmitting}
              disabled={!canCheckout}
              onClick={handleSubmit}
            >
              {isExistingSubscriber
                ? 'Update subscription'
                : 'Start free trial & go to dashboard'}
              {!isExistingSubscriber && <ArrowRight className='ml-2 h-4 w-4' />}
            </LoadingButton>

            <p className='text-muted-foreground mt-3 text-center text-xs'>
              {isExistingSubscriber
                ? 'Changes apply immediately'
                : `${TRIAL_DAYS}-day free trial · Cancel anytime`}
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
