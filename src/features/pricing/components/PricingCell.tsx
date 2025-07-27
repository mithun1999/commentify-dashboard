'use client'

import { Check } from 'lucide-react'
import { LoadingButton } from '@/components/ui/LoadingButton'
import type { IDisplayProduct } from '../interfaces/price.interface'
import PriceWrapper from './PriceWrapper'

interface PricingCellProps extends IDisplayProduct {
  onClick: () => void
  disabled?: boolean
  popular?: boolean
  isSubmitLoading?: boolean
}

function PricingCell({
  name,
  features,
  variant,
  defaultDisplayPrice,
  popular,
  onClick,
  disabled,
  isSubmitLoading,
}: PricingCellProps) {
  if (popular) {
    return (
      <PriceWrapper className='relative'>
        <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
          <span className='bg-primary/10 text-primary rounded-xl px-3 py-1 text-sm font-semibold'>
            MOST POPULAR
          </span>
        </div>
        <div className='px-12 py-4'>
          <h3 className='text-2xl font-medium'>{name}</h3>
          <div className='flex justify-center'>
            <span className='text-5xl font-black'>
              {variant?.displayPrice ?? defaultDisplayPrice}
            </span>
          </div>
        </div>
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
              disabled={disabled}
              loading={isSubmitLoading}
            >
              Select
            </LoadingButton>
          </div>
        </div>
      </PriceWrapper>
    )
  }

  return (
    <PriceWrapper>
      <div className='px-12 py-4'>
        <h3 className='text-2xl font-medium'>{name}</h3>
        <div className='flex justify-center'>
          <span className='text-5xl font-black'>
            {variant?.displayPrice ?? defaultDisplayPrice}
          </span>
        </div>
      </div>
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
            disabled={disabled}
            loading={isSubmitLoading}
          >
            Select
          </LoadingButton>
        </div>
      </div>
    </PriceWrapper>
  )
}

export default PricingCell
