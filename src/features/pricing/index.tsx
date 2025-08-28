'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import {
  useCreateCheckoutUrl,
  useUpdateSubscriptionPlan,
} from '../subscription/query/subscription.query'
import PricingCell from './components/PricingCell'
import SubscriptionToggle from './components/SubscriptionToggle'
import type { IDisplayProduct } from './interfaces/price.interface'
import { useGetPlans } from './query/pricing.query'
import { usePostHog } from 'posthog-js/react'

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
      console.log(error)
    }
  }

  const { createCheckoutUrl, isCreatingCheckoutUrl } = useCreateCheckoutUrl({
    cb: handleOpenLsModal,
  })

  const updatedPlans: IDisplayProduct[] = useMemo(() => {
    const safePlans = Array.isArray(plans) ? plans : []
    return safePlans
      .map((plan) => {
        const found = (plan.variant || []).find(
          (v) => (v.name || '').toLowerCase() === subscriptionType
        )
        const priceCents = found?.price ?? 0
        const updatedVariant = {
          ...(found || {}),
          displayPrice: `$${Math.round(priceCents / 100)}`,
        } as IDisplayProduct['variant']

        const base = {
          ...plan,
          variant: updatedVariant,
        } as unknown as IDisplayProduct

        if (popularPlans.includes((plan.name || '').toLowerCase())) {
          return { ...base, popular: true }
        }
        return base
      })
      .filter((p) => Boolean(p?.variant?._id))
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

  const getDisabledPlanState = (data: IDisplayProduct): boolean => {
    if (user?.status === UserSubscriptionStatus.IN_TRIAL) return false
    else if (user?.subscribedProductVariantId === data?.variant?._id)
      return true
    return false
  }

  const handlePlanSelect = ({
    productId,
    variantId,
  }: {
    variantId: string
    productId: string
  }) => {
    posthog?.capture('select_plan_clicked', {
      productId,
      variantId,
      subscriptionType,
      hasActiveSubscription: Boolean(user?.subscription),
    })
    if (user?.subscription) {
      updateSubscriptionPlan({ productId, variantId })
    } else {
      createCheckoutUrl({ variantId, embed: false })
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
            <div className='text-sm font-medium text-muted-foreground'>
              (Switch to annual plan for 20% off)
            </div>
          </div>

          <div className='flex flex-col items-center justify-center space-y-4 py-10 md:flex-row md:items-start md:space-y-0 md:space-x-10'>
            {updatedPlans?.map((data, idx) => (
              <PricingCell
                key={idx}
                onClick={() =>
                  handlePlanSelect({
                    variantId: data.variant!._id!,
                    productId: data._id!,
                  })
                }
                disabled={
                  isCreatingCheckoutUrl ||
                  isUpdatingSubscriptionPlan ||
                  getDisabledPlanState(data)
                }
                isSubmitLoading={
                  isCreatingCheckoutUrl || isUpdatingSubscriptionPlan
                }
                {...data}
              />
            ))}
          </div>
        </div>
      </Main>
    </>
  )
}
