'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
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

export default function Pricing() {
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
    return plans?.map((plan) => {
      const variant = plan.variant.find(
        (v) => v.name.toLowerCase() === subscriptionType
      )
      const updatedVariant = {
        ...variant,
        displayPrice: `$${Math.round(variant?.price / 100)}`,
      }

      if (popularPlans.includes(plan.name.toLowerCase())) {
        return {
          ...plan,
          popular: true,
          variant: updatedVariant,
        }
      }
      return {
        ...plan,
        variant: updatedVariant,
      }
    })
  }, [plans, subscriptionType])

  const handleUpdatingSubscription = () => {
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
    if (user?.subscription) {
      updateSubscriptionPlan({ productId, variantId })
    } else {
      createCheckoutUrl({ variantId, embed: false })
    }
  }

  if (isFetchingPlans) {
    return (
      <div className='mt-5 pt-20 md:pt-20 xl:pt-20'>
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
    )
  }

  return (
    <div className='mt-5 py-12 pt-20 md:pt-20 xl:pt-20'>
      <div className='flex flex-col items-center justify-center space-y-2 text-center'>
        <h1 className='text-4xl font-bold'>Plans that fit your need</h1>
        <p className='text-muted-foreground text-lg'>
          Simple price, Big impact
        </p>
        <SubscriptionToggle
          subscriptionType={subscriptionType}
          onChange={handleUpdatingSubscription}
        />
      </div>

      <div className='flex flex-col items-center justify-center space-y-4 py-10 md:flex-row md:items-start md:space-y-0 md:space-x-10'>
        {updatedPlans?.map((data, idx) => (
          <PricingCell
            key={idx}
            onClick={() =>
              handlePlanSelect({
                variantId: data?.variant?._id,
                productId: data?._id,
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
  )
}
