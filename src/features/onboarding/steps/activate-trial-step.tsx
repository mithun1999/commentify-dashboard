'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, CreditCard, Loader2, Minus, Plus, Shield, XCircle, Zap } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { paymentConfig } from '@/config/payment.config'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery, UserQueryEnum } from '@/features/auth/query/user.query'
import { useAgents } from '@/features/agent-system/hooks/use-agents'
import type { PaymentProvider } from '@/features/subscription/interfaces/subscription.interface'
import { useCreateCheckoutUrl } from '@/features/subscription/query/subscription.query'
import { verifyCheckout } from '@/features/subscription/api/subscription.api'
import { useGetPlans } from '@/features/pricing/query/pricing.query'
import type { IDisplayProduct } from '@/features/pricing/interfaces/price.interface'
import { getCurrencySymbol } from '@/features/pricing/utils/prices.util'
import { useOnboarding } from '@/stores/onboarding.store'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useTrackStepView } from '../hooks/useTrackStepView'

const activateTrialRoute = getRouteApi('/onboarding/activate-trial')

type PlanTier = 'pro' | 'premium'
type CheckoutState = 'selecting' | 'processing' | 'success' | 'failed'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10000

const CONTEXTUAL_FEATURES: Record<string, Record<PlanTier, string[]>> = {
  'linkedin-sales': {
    pro: [
      'Up to 50 AI comments per day targeting prospects',
      'Auto-find posts mentioning your product niche',
      'Personalized sales-focused tone',
      'Filter out hiring & job-update posts',
    ],
    premium: [
      'Up to 100 AI comments per day targeting prospects',
      'Auto-find posts mentioning your product niche',
      'Personalized sales-focused tone',
      'Filter out hiring & job-update posts',
      'Target by prospect job titles (CEO, VP, etc.)',
      'Tag post authors for direct engagement',
      'Custom post skipping rules',
    ],
  },
  'linkedin-branding': {
    pro: [
      'Up to 50 AI comments per day to grow your brand',
      'Keyword-based post targeting',
      'Personalized tone matching your voice',
      'Filter out hiring & job-update posts',
    ],
    premium: [
      'Up to 100 AI comments per day to grow your brand',
      'Keyword-based post targeting',
      'Personalized tone matching your voice',
      'Filter out hiring & job-update posts',
      'Target by author job titles',
      'Tag post authors for direct engagement',
      'Custom post skipping rules',
    ],
  },
  'twitter': {
    pro: [
      'Up to 50 AI replies per day',
      'Keyword & hashtag targeting',
      'Personalized reply tone',
    ],
    premium: [
      'Up to 100 AI replies per day',
      'Keyword & hashtag targeting',
      'Personalized reply tone',
      'Tag tweet authors',
      'Advanced engagement filters',
    ],
  },
}

function getContextKey(agentType: string | null, agentMode: string | null): string {
  if (agentType === 'twitter-commenting') return 'twitter'
  if (agentMode === 'sales') return 'linkedin-sales'
  return 'linkedin-branding'
}

function getFeaturesForPlan(planName: string, contextKey: string): string[] | null {
  const tier = planName.toLowerCase() as PlanTier
  return CONTEXTUAL_FEATURES[contextKey]?.[tier] ?? null
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
    if (checkoutState === 'processing' && user?.status && user.status !== UserSubscriptionStatus.PENDING) {
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

  return { checkoutState, timedOut, retryCheckout, subscriptionId: subscription_id }
}

export function ActivateTrialStep() {
  useTrackStepView('activate-trial')
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { data: user } = useGetUserQuery()
  const { agents } = useAgents()
  const { data: plans, isLoading: isFetchingPlans } = useGetPlans()
  const { data: onboardingData } = useOnboarding()
  const contextKey = getContextKey(onboardingData.selectedAgentType, onboardingData.selectedAgentMode)
  const { checkoutState, timedOut, retryCheckout } = useCheckoutReturn()

  const minQuantity = Math.max(agents.length, 1)
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly'>('monthly')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

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

  const updatedPlans: IDisplayProduct[] = useMemo(() => {
    const safePlans = Array.isArray(plans) ? plans : []
    return safePlans
      .filter((plan) => plan.interval === subscriptionType && plan.status === 'active')
      .map((plan) => {
        const currencySymbol = getCurrencySymbol(plan.currency)
        const displayPrice = `${currencySymbol}${plan.defaultDisplayPrice}`
        const basePlanName = plan.name.replace(/\s+(Monthly|Yearly)$/i, '').toLowerCase()
        return { ...plan, displayPrice, popular: basePlanName === 'premium' }
      })
  }, [plans, subscriptionType])

  const getQuantity = useCallback(
    (productId: string) => quantities[productId] ?? minQuantity,
    [quantities, minQuantity]
  )

  const handlePlanSelect = (product: IDisplayProduct) => {
    const quantity = getQuantity(product._id)
    posthog?.capture('onboarding_checkout_started', {
      product_id: product._id,
      plan_name: product.name,
      subscription_type: subscriptionType,
      quantity,
      price: product.defaultDisplayPrice,
      currency: product.currency,
    })
    createCheckoutUrl({
      productId: product._id,
      provider: paymentConfig.defaultPaymentProvider as PaymentProvider,
      embed: false,
      quantity,
    })
  }

  if (user?.status && user.status !== UserSubscriptionStatus.PENDING) {
    if (checkoutState !== 'success') {
      navigate({ to: '/' })
    }
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
    <OnboardingCard
      title='Start your free trial'
      description="You're all set up! Add a payment method to activate your trial. You won't be charged until it ends."
      className='max-w-3xl'
    >
      <div className='space-y-6'>
        <div className='bg-primary/5 border-primary/20 flex items-start gap-3 rounded-xl border p-4'>
          <Shield className='text-primary mt-0.5 h-5 w-5 flex-shrink-0' />
          <div className='text-sm'>
            <p className='text-foreground font-medium'>100% risk-free trial</p>
            <p className='text-muted-foreground'>
              Cancel anytime during your trial - no charges, no questions asked. We'll notify you a few days before your trial ends. Takes less than 2 minutes to set up.
            </p>
          </div>
        </div>

        <div className='flex items-center justify-center gap-3'>
          <Label htmlFor='trial-billing-toggle' className='text-sm font-medium'>Monthly</Label>
          <Switch
            id='trial-billing-toggle'
            checked={subscriptionType === 'yearly'}
            onCheckedChange={() => setSubscriptionType((p) => p === 'monthly' ? 'yearly' : 'monthly')}
          />
          <Label htmlFor='trial-billing-toggle' className='text-sm font-medium'>
            Yearly <span className='text-primary font-semibold'>(Save 20%)</span>
          </Label>
        </div>

        {isFetchingPlans ? (
          <div className='flex items-center justify-center py-12'>
            <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
          </div>
        ) : (
          <div className='flex flex-col items-center gap-4 md:flex-row md:items-stretch md:justify-center'>
            {updatedPlans.map((plan) => {
              const qty = getQuantity(plan._id)
              const unitPrice = parseFloat(plan.defaultDisplayPrice) || 0
              const totalPrice = unitPrice * qty
              const intervalLabel = plan.interval === 'yearly' ? '/yr' : '/mo'
              const currencySymbol = getCurrencySymbol(plan.currency)
              const baseName = plan.name.replace(/\s+(Monthly|Yearly)$/i, '')

              return (
                <div
                  key={plan._id}
                  className={`border-border bg-card relative flex w-full flex-col rounded-xl border shadow-sm transition-shadow hover:shadow-md md:w-64 ${
                    plan.popular ? 'ring-primary ring-2' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                      <span className='bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold'>
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className='flex flex-1 flex-col p-5 pt-6'>
                    <h3 className='text-center text-lg font-semibold'>{baseName}</h3>
                    <div className='mt-2 flex items-baseline justify-center gap-1'>
                      <span className='text-3xl font-bold'>{plan.displayPrice}</span>
                      <span className='text-muted-foreground text-sm'>{intervalLabel}</span>
                    </div>

                    <div className='mt-3 flex items-center justify-center gap-2'>
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-7 w-7 rounded-full'
                        onClick={() => setQuantities((prev) => ({ ...prev, [plan._id]: Math.max(minQuantity, qty - 1) }))}
                        disabled={qty <= minQuantity}
                      >
                        <Minus className='h-3 w-3' />
                      </Button>
                      <span className='w-6 text-center text-sm font-semibold'>{qty}</span>
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-7 w-7 rounded-full'
                        onClick={() => setQuantities((prev) => ({ ...prev, [plan._id]: Math.min(50, qty + 1) }))}
                        disabled={qty >= 50}
                      >
                        <Plus className='h-3 w-3' />
                      </Button>
                      <span className='text-muted-foreground text-xs'>agents</span>
                    </div>
                    {qty > 1 && (
                      <p className='text-muted-foreground mt-1 text-center text-xs'>
                        Total: {currencySymbol}{totalPrice}{intervalLabel}
                      </p>
                    )}

                    <ul className='mt-4 flex-1 space-y-2'>
                      {(getFeaturesForPlan(baseName, contextKey) ?? plan.features)?.map((feat, idx) => (
                        <li key={idx} className='flex items-start gap-2 text-sm'>
                          <Check className='mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500' />
                          <span dangerouslySetInnerHTML={{ __html: feat }} />
                        </li>
                      ))}
                    </ul>

                    <LoadingButton
                      className='mt-4 w-full'
                      onClick={() => handlePlanSelect(plan)}
                      disabled={isCreatingCheckoutUrl}
                      loading={isCreatingCheckoutUrl}
                    >
                      <CreditCard className='mr-2 h-4 w-4' />
                      Start Free Trial
                    </LoadingButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className='flex items-center justify-center gap-6 pt-2'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Zap className='h-3.5 w-3.5' />
            <span>Instant activation</span>
          </div>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Shield className='h-3.5 w-3.5' />
            <span>Cancel anytime</span>
          </div>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <CreditCard className='h-3.5 w-3.5' />
            <span>Secure payment</span>
          </div>
        </div>
      </div>

      <OnboardingNavigation
        prevStep='/onboarding/identity'
        currentStep='activate-trial'
      />
    </OnboardingCard>
  )
}
