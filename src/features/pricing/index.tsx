'use client'

import { useMemo, useState } from 'react'
import { paymentConfig } from '@/config/payment.config'
import { Loader2 } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { PaymentProvider } from '../subscription/interfaces/subscription.interface'
import {
  useCreateCheckoutUrl,
  useUpdateSubscriptionPlan,
} from '../subscription/query/subscription.query'
import PricingCell from './components/PricingCell'
import SubscriptionToggle from './components/SubscriptionToggle'
import type { IDisplayProduct } from './interfaces/price.interface'
import { useGetPlans } from './query/pricing.query'
import { getCurrencySymbol } from './utils/prices.util'

export default function Pricing() {
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { data: plans, isLoading: isFetchingPlans } = useGetPlans()
  const { updateSubscriptionPlan, isUpdatingSubscriptionPlan } =
    useUpdateSubscriptionPlan()

  const popularPlans = ['premium']
  const [subscriptionType, setSubscriptionType] = useState<
    'monthly' | 'yearly'
  >('monthly')

  const handleOpenLsModal = (url: string) => {
    try {
      window.LemonSqueezy.Url.Open(url)
    } catch (error: unknown) {
      toast.error('Checkout url is not valid')
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  const handleCheckoutUrl = (url: string) => {
    const provider = paymentConfig.defaultPaymentProvider as PaymentProvider
    if (provider === 'lemon_squeezy') {
      handleOpenLsModal(url)
    } else if (provider === 'dodo_payments') {
      window.location.href = url
    }
  }

  const { createCheckoutUrl, isCreatingCheckoutUrl } = useCreateCheckoutUrl({
    cb: handleCheckoutUrl,
  })

  const updatedPlans: IDisplayProduct[] = useMemo(() => {
    const safePlans = Array.isArray(plans) ? plans : []

    // Filter plans by subscription type (interval: monthly/yearly)
    return safePlans
      .filter((plan) => plan.interval === subscriptionType)
      .map((plan) => {
        // Format display price with currency symbol
        const currencySymbol = getCurrencySymbol(plan.currency)
        const displayPrice = `${currencySymbol}${plan.defaultDisplayPrice}`

        // Extract base plan name (e.g., "Premium" from "Premium Monthly")
        const basePlanName = plan.name
          .replace(/\s+(Monthly|Yearly)$/i, '')
          .toLowerCase()

        // Create display product
        const displayProduct: IDisplayProduct = {
          ...plan,
          displayPrice,
          popular: popularPlans.includes(basePlanName),
        }

        return displayProduct
      })
      .filter((p) => p.status === 'active')
  }, [plans, subscriptionType])

  const handleUpdatingSubscription = () => {
    posthog?.capture('subscription_toggle_clicked', {
      to: subscriptionType === 'monthly' ? 'yearly' : 'monthly',
      from: subscriptionType,
    })
    setSubscriptionType((prev) => {
      if (prev === 'monthly') return 'yearly'
      return 'monthly'
    })
  }

  const isCurrentPlan = (data: IDisplayProduct): boolean => {
    // Check if this plan is the user's current active subscription
    if (user?.status === UserSubscriptionStatus.ACTIVE) {
      // Compare with subscribedProductId to check if this is the active plan
      return user?.subscribedProductId === data._id
    }
    return false
  }

  const handlePlanSelect = ({
    productId,
    planName,
    chargeType,
  }: {
    productId: string
    planName: string
    chargeType: string
  }) => {
    posthog?.capture('select_plan_clicked', {
      productId,
      subscriptionType,
      hasActiveSubscription: Boolean(user?.subscription),
      planName,
      chargeType,
    })
    if (user?.status === UserSubscriptionStatus.ACTIVE) {
      updateSubscriptionPlan({ productId })
    } else {
      createCheckoutUrl({
        productId,
        provider: paymentConfig.defaultPaymentProvider as PaymentProvider,
        embed: false,
      })
    }
  }

  if (isFetchingPlans) {
    return (
      <>
        <Header fixed>
          <div className='ml-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        <Main>
          <div className='mt-10'>
            <div className='mx-auto max-w-4xl'>
              <Card>
                <CardContent className='flex flex-col items-center justify-center gap-5 p-8'>
                  <h2 className='text-center text-lg font-bold'>
                    Hold tight! Plan's en route! 🚀
                  </h2>
                  <Loader2 className='text-primary h-6 w-6 animate-spin' />
                </CardContent>
              </Card>
            </div>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='py-8'>
          <div className='flex flex-col items-center justify-center space-y-2 text-center'>
            <h1 className='text-3xl font-semibold'>Plans that fit your need</h1>
            <p className='text-muted-foreground text-lg'>
              Simple price, Big impact
            </p>
            <SubscriptionToggle
              subscriptionType={subscriptionType}
              onChange={handleUpdatingSubscription}
            />
            <div className='text-muted-foreground text-sm font-medium'>
              (Switch to annual plan for 20% off)
            </div>
          </div>

          <div className='flex flex-col items-center justify-center space-y-4 py-10 md:flex-row md:items-start md:space-y-0 md:space-x-10'>
            {updatedPlans?.map((data, idx) => {
              const isCurrent = isCurrentPlan(data)
              return (
                <PricingCell
                  key={idx}
                  onClick={() =>
                    handlePlanSelect({
                      productId: data._id,
                      planName: data.name,
                      chargeType: subscriptionType,
                    })
                  }
                  disabled={
                    isCreatingCheckoutUrl ||
                    isUpdatingSubscriptionPlan ||
                    isCurrent
                  }
                  isSubmitLoading={
                    isCreatingCheckoutUrl || isUpdatingSubscriptionPlan
                  }
                  isCurrentPlan={isCurrent}
                  {...data}
                />
              )
            })}
          </div>
        </div>
      </Main>
    </>
  )
}
