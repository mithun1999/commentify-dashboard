'use client'

import { useEffect, useMemo, useRef } from 'react'
import { paymentConfig } from '@/config/payment.config'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetPlans } from '@/features/pricing/query/pricing.query'
import type { PaymentProvider } from '@/features/subscription/interfaces/subscription.interface'
import {
  useCreateTopupCheckoutUrl,
  useGetPostCreditsQuery,
} from '@/features/subscription/query/subscription.query'

const TOPUP_PROVIDER = paymentConfig.defaultPaymentProvider as PaymentProvider

function priceLabel(product: { defaultDisplayPrice?: string; defaultPrice: number }) {
  if (product.defaultDisplayPrice) return product.defaultDisplayPrice
  return `$${Math.round((product.defaultPrice || 0) / 100)}`
}

export function PostCreditsCard() {
  const { data: plans, isLoading: isLoadingPlans } = useGetPlans()
  const { data: credits } = useGetPostCreditsQuery()

  const monthlyAllowance = credits?.monthlyAllowance ?? 0
  const monthlyUsed = credits?.monthlyUsed ?? 0
  const monthlyRemaining = credits?.monthlyRemaining ?? 0
  const lifetimeCredits = credits?.lifetimeCredits ?? 0
  const usagePct =
    monthlyAllowance > 0
      ? Math.min(100, Math.round((monthlyUsed / monthlyAllowance) * 100))
      : 0
  const usedAll = monthlyAllowance > 0 && monthlyUsed >= monthlyAllowance

  const redirectToCheckout = (url: string) => {
    window.location.href = url
  }
  const { createTopupCheckoutUrl, isCreatingTopupCheckoutUrl, pendingProductId } =
    useCreateTopupCheckoutUrl({ cb: redirectToCheckout })

  const topups = useMemo(
    () =>
      (plans || [])
        .filter((p) => p.kind === 'topup' && p.agentType === 'post')
        .sort((a, b) => (a.creditAmount || 0) - (b.creditAmount || 0)),
    [plans]
  )

  // Auto-start checkout when arriving from the marketing site's "Add pack" CTA
  // (/billing?topup=small|medium|large). Runs once after packs load.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current || !topups.length) return
    const param = new URLSearchParams(window.location.search).get('topup')
    if (!param) return
    const match = topups.find((p) => p.sku === `topup_post_${param}`)
    if (!match) return
    autoStartedRef.current = true
    createTopupCheckoutUrl({ productId: match._id, provider: TOPUP_PROVIDER })
  }, [topups, createTopupCheckoutUrl])

  if (!isLoadingPlans && topups.length === 0) return null

  return (
    <Card className='mt-6'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Sparkles className='text-primary h-5 w-5' />
          Post generation credits
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-5'>
        {monthlyAllowance > 0 && (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-3'>
              <p className='text-sm font-medium'>Generations this cycle</p>
              <span className='text-muted-foreground text-sm'>
                {monthlyUsed} of {monthlyAllowance} used
              </span>
            </div>
            <div className='bg-muted h-3 w-full overflow-hidden rounded-full'>
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  usedAll ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className='text-muted-foreground text-xs'>
              {credits?.enforced
                ? `${monthlyRemaining} left · resets on your next billing date`
                : 'Resets on your next billing date'}
              {lifetimeCredits > 0 &&
                ` · +${lifetimeCredits} top-up credits available`}
            </p>
          </div>
        )}

        <div className='flex flex-wrap items-end gap-x-8 gap-y-2'>
          <div>
            <p className='text-2xl font-bold'>{lifetimeCredits}</p>
            <p className='text-muted-foreground text-sm'>
              top-up credits (never expire)
            </p>
          </div>
        </div>

        <p className='text-muted-foreground text-sm'>
          Need more posts? Top up anytime — credits roll over and never expire.
        </p>

        {isLoadingPlans ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <div className='grid gap-4 sm:grid-cols-3'>
            {topups.map((pack) => (
              <div
                key={pack._id}
                className='flex flex-col rounded-lg border p-4'
              >
                <div className='flex items-baseline gap-1'>
                  <span className='text-2xl font-bold'>
                    {pack.creditAmount}
                  </span>
                  <span className='text-muted-foreground text-sm'>
                    generations
                  </span>
                </div>
                <div className='text-primary mt-1 text-lg font-semibold'>
                  {priceLabel(pack)}
                </div>
                <Button
                  className='mt-4'
                  variant='outline'
                  disabled={isCreatingTopupCheckoutUrl}
                  onClick={() =>
                    createTopupCheckoutUrl({
                      productId: pack._id,
                      provider: TOPUP_PROVIDER,
                    })
                  }
                >
                  {isCreatingTopupCheckoutUrl && pendingProductId === pack._id ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Add pack'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
