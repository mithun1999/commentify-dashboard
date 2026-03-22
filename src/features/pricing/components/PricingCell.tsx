'use client'

import { Check, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/LoadingButton'
import type { IDisplayProduct } from '../interfaces/price.interface'
import PriceWrapper from './PriceWrapper'

interface PricingCellProps extends IDisplayProduct {
  onClick: () => void
  disabled?: boolean
  popular?: boolean
  isSubmitLoading?: boolean
  isCurrentPlan?: boolean
  quantity: number
  minQuantity: number
  onQuantityChange: (quantity: number) => void
  currencySymbol: string
  hasActiveSubscription?: boolean
  currentSubscriptionQuantity?: number
  currentPlanPrice?: number
}

function QuantityStepper({
  quantity,
  minQuantity,
  onQuantityChange,
}: {
  quantity: number
  minQuantity: number
  onQuantityChange: (quantity: number) => void
}) {
  return (
    <div className='flex items-center justify-center gap-3 py-3'>
      <Button
        variant='outline'
        size='icon'
        className='h-8 w-8 rounded-full'
        onClick={() => onQuantityChange(quantity - 1)}
        disabled={quantity <= minQuantity}
      >
        <Minus className='h-4 w-4' />
      </Button>
      <span className='w-8 text-center text-lg font-semibold'>{quantity}</span>
      <Button
        variant='outline'
        size='icon'
        className='h-8 w-8 rounded-full'
        onClick={() => onQuantityChange(quantity + 1)}
        disabled={quantity >= 50}
      >
        <Plus className='h-4 w-4' />
      </Button>
      <span className='text-muted-foreground text-sm font-medium'>Agents</span>
    </div>
  )
}

function PricingCell({
  name,
  features,
  displayPrice,
  defaultDisplayPrice,
  defaultPrice,
  popular,
  onClick,
  disabled,
  isSubmitLoading,
  isCurrentPlan,
  quantity,
  minQuantity,
  onQuantityChange,
  currencySymbol,
  interval,
  hasActiveSubscription,
  currentSubscriptionQuantity,
  currentPlanPrice,
}: PricingCellProps) {
  const baseName = name.replace(/\s+(Monthly|Yearly)$/i, '')
  const unitPrice = parseFloat(defaultDisplayPrice) || 0
  const totalPrice = unitPrice * quantity
  const intervalLabel = interval === 'yearly' ? '/yr' : '/mo'

  const quantityChanged = isCurrentPlan && quantity !== currentSubscriptionQuantity

  const getButtonLabel = () => {
    if (!hasActiveSubscription) return 'Select'
    if (isCurrentPlan && !quantityChanged) return 'Current Plan'
    if (isCurrentPlan && quantityChanged) {
      return quantity > (currentSubscriptionQuantity ?? 1)
        ? 'Upgrade'
        : 'Downgrade'
    }
    const thisTotalPrice = defaultPrice * quantity
    const currentTotalPrice = (currentPlanPrice ?? 0) * (currentSubscriptionQuantity ?? 1)
    return thisTotalPrice >= currentTotalPrice ? 'Upgrade' : 'Downgrade'
  }

  const isButtonDisabled =
    disabled || (isCurrentPlan && !quantityChanged)

  const priceSection = (
    <div className='px-12 py-4'>
      <h3 className='mb-2 text-center text-2xl font-medium'>{baseName}</h3>
      <div className='flex justify-center'>
        <span className='text-5xl font-black'>{displayPrice}</span>
      </div>
      <QuantityStepper
        quantity={quantity}
        minQuantity={minQuantity}
        onQuantityChange={onQuantityChange}
      />
      {quantity > 1 && (
        <p className='text-muted-foreground text-center text-sm'>
          Total: {currencySymbol}{totalPrice}{intervalLabel}
        </p>
      )}
    </div>
  )

  const featuresSection = (
    <div className='bg-muted/50 rounded-b-xl py-4'>
      <ul className='space-y-3 px-12 text-left'>
        {features?.map((feat, idx) => (
          <li key={idx} className='flex items-start gap-2'>
            <Check className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-500' />
            <span dangerouslySetInnerHTML={{ __html: feat }} />
          </li>
        ))}
      </ul>
      <div className='mx-auto w-4/5 pt-7'>
        <LoadingButton
          className='w-full'
          onClick={onClick}
          disabled={isButtonDisabled}
          loading={isSubmitLoading}
        >
          {getButtonLabel()}
        </LoadingButton>
      </div>
    </div>
  )

  if (popular) {
    return (
      <PriceWrapper className='relative'>
        <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
          <span className='bg-primary/10 text-primary rounded-xl px-3 py-1 text-sm font-semibold'>
            MOST POPULAR
          </span>
        </div>
        {priceSection}
        {featuresSection}
      </PriceWrapper>
    )
  }

  return (
    <PriceWrapper>
      {priceSection}
      {featuresSection}
    </PriceWrapper>
  )
}

export default PricingCell
