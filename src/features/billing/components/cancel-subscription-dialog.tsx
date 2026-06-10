'use client'

import { useState } from 'react'
import { Crisp } from 'crisp-sdk-web'
import { Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useCancelSubscription } from '@/features/subscription/query/subscription.query'

type RetentionKind = 'price' | 'help' | 'soft'

const CANCEL_REASONS: { value: string; label: string; retention: RetentionKind }[] =
  [
    {
      value: 'too_expensive',
      label: 'Too expensive / not worth the price',
      retention: 'price',
    },
    {
      value: 'quality',
      label: "Comment or post quality wasn't good enough",
      retention: 'help',
    },
    {
      value: 'no_results',
      label: "Didn't see results (engagement / leads / growth)",
      retention: 'help',
    },
    {
      value: 'missing_feature',
      label: 'Missing a feature or platform I needed',
      retention: 'soft',
    },
    {
      value: 'too_complex',
      label: "Too complicated / didn't have time to set it up",
      retention: 'help',
    },
    {
      value: 'account_safety',
      label: 'Worried about my account being flagged or banned',
      retention: 'help',
    },
    {
      value: 'temporary',
      label: 'Only needed it temporarily / was just testing',
      retention: 'soft',
    },
    { value: 'other', label: 'Other', retention: 'soft' },
  ]

function formatDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'reason' | 'offer' | 'done'>('reason')
  const [reason, setReason] = useState<string>('')
  const [comment, setComment] = useState('')
  const [endsAt, setEndsAt] = useState<string | null>(null)

  const { cancelSubscription, isCancellingSubscription } = useCancelSubscription({
    cb: (data) => {
      setEndsAt(data.endsAt)
      setStep('done')
    },
  })

  const selected = CANCEL_REASONS.find((r) => r.value === reason)

  const reset = () => {
    setStep('reason')
    setReason('')
    setComment('')
    setEndsAt(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleConfirmCancel = () => {
    cancelSubscription({ reason, comment: comment.trim() || undefined })
  }

  const retention = selected?.retention ?? 'soft'
  const offer = {
    price: {
      title: 'Would a smaller plan work better?',
      body: 'You can switch to a lower tier and keep your agents running for less — no need to cancel completely.',
      cta: 'View plans',
      action: () => {
        handleOpenChange(false)
        navigate({ to: '/plans' })
      },
    },
    help: {
      title: 'Let us help you get more out of Commentify',
      body: "Most of these are quick fixes. Chat with us and we'll help you dial in quality and results before you go.",
      cta: 'Chat with us',
      action: () => {
        if (Crisp.isCrispInjected()) Crisp.chat.open()
        else window.open('mailto:support@commentify.co', '_blank')
        handleOpenChange(false)
      },
    },
    soft: {
      title: "We'd love to have you back",
      body: 'You can resubscribe anytime and pick up right where you left off.',
      cta: 'Keep my subscription',
      action: () => handleOpenChange(false),
    },
  }[retention]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {step === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle>Before you cancel</DialogTitle>
              <DialogDescription>
                We're sorry to see you go. What's the main reason you're
                cancelling?
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={reason}
              onValueChange={setReason}
              className='gap-2'
            >
              {CANCEL_REASONS.map((r) => (
                <Label
                  key={r.value}
                  htmlFor={`cancel-${r.value}`}
                  className='hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-normal'
                >
                  <RadioGroupItem value={r.value} id={`cancel-${r.value}`} />
                  {r.label}
                </Label>
              ))}
            </RadioGroup>

            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything we could've done better? (optional)"
              className='mt-1 resize-none'
              rows={2}
            />

            <DialogFooter className='gap-2 sm:gap-2'>
              <Button variant='ghost' onClick={() => handleOpenChange(false)}>
                Never mind
              </Button>
              <Button disabled={!reason} onClick={() => setStep('offer')}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'offer' && (
          <>
            <DialogHeader>
              <DialogTitle>{offer.title}</DialogTitle>
              <DialogDescription>{offer.body}</DialogDescription>
            </DialogHeader>

            <DialogFooter className='gap-2 sm:gap-2'>
              <Button
                variant='ghost'
                className='text-muted-foreground'
                disabled={isCancellingSubscription}
                onClick={handleConfirmCancel}
              >
                {isCancellingSubscription ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Cancel anyway'
                )}
              </Button>
              <Button onClick={offer.action} disabled={isCancellingSubscription}>
                {offer.cta}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Your subscription is cancelled</DialogTitle>
              <DialogDescription>
                {formatDate(endsAt)
                  ? `You'll keep access until ${formatDate(endsAt)}. You won't be charged again.`
                  : "Your subscription won't renew. You'll keep access until the end of your current period."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
