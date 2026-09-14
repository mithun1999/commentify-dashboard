import { AlertCircle, CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IPaymentRecovery } from '@/features/subscription/api/subscription.api'

/**
 * Surfaces a failed renewal at the top of Billing with a one-click way to clear
 * the outstanding amount, so users don't have to hunt through the customer
 * portal to get their agents running again.
 */
export function PaymentAttentionCard({
  recovery,
  portalUrl,
}: {
  recovery?: IPaymentRecovery
  portalUrl?: string
}) {
  if (!recovery?.needsAttention) return null

  const { paymentLink } = recovery

  return (
    <Card className='border-destructive/50 bg-destructive/5 mt-4'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <AlertCircle className='text-destructive h-5 w-5' />
          Payment failed — your agents are paused
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <p className='text-muted-foreground text-sm'>
          {paymentLink
            ? 'We couldn’t charge your card for the latest renewal. Pay the outstanding amount now to reactivate your subscription — your agents resume within a few minutes.'
            : 'We couldn’t charge your card for the latest renewal. Update your payment method to reactivate your subscription.'}
        </p>

        <div className='flex flex-wrap gap-3'>
          {paymentLink ? (
            <Button
              onClick={() => window.open(paymentLink, '_blank')}
              className='gap-2'
            >
              <CreditCard className='h-4 w-4' />
              Pay now
              <ExternalLink className='h-4 w-4' />
            </Button>
          ) : null}

          <Button
            variant='outline'
            disabled={!portalUrl}
            onClick={() => portalUrl && window.open(portalUrl, '_blank')}
          >
            Update payment method
            <ExternalLink className='ml-2 h-4 w-4' />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
