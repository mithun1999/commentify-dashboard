import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Clock, Sparkles, X } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import {
  UserSubscriptionStatus,
  type IUser,
} from '@/features/auth/interface/user.interface'

function getTrialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const now = new Date()
  const end = new Date(trialEndsAt)
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function TrialBanner({
  user,
  onDismiss,
}: {
  user: IUser
  onDismiss?: () => void
}) {
  const posthog = usePostHog()
  const daysLeft = useMemo(
    () => getTrialDaysLeft(user.trialEndsAt),
    [user.trialEndsAt]
  )

  if (user.status === UserSubscriptionStatus.PENDING) {
    return (
      <div className='relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm text-white'>
        <Sparkles className='h-4 w-4 shrink-0' />
        <span className='font-medium'>
          Add a payment method to start your free trial and activate your
          agents.
        </span>
        <Button
          size='sm'
          variant='secondary'
          className='h-7 gap-1.5 bg-white/90 text-gray-900 hover:bg-white'
          asChild
        >
          <Link
            to='/pricing'
            onClick={() =>
              posthog?.capture('trial_banner_activate_clicked')
            }
          >
            <Sparkles className='h-3.5 w-3.5' />
            Start Free Trial
          </Link>
        </Button>
      </div>
    )
  }

  if (user.status === UserSubscriptionStatus.TRIAL_EXPIRED) {
    return (
      <div className='relative flex items-center justify-center gap-3 bg-red-600 px-4 py-2.5 text-sm text-white'>
        <Clock className='h-4 w-4 shrink-0' />
        <span className='font-medium'>
          Your trial has expired. Upgrade now to keep your agents running.
        </span>
        <Button
          size='sm'
          variant='secondary'
          className='h-7 gap-1.5 bg-white text-red-600 hover:bg-red-50'
          asChild
        >
          <Link
            to='/pricing'
            onClick={() => posthog?.capture('trial_banner_upgrade_clicked')}
          >
            <Sparkles className='h-3.5 w-3.5' />
            Choose a Plan
          </Link>
        </Button>
      </div>
    )
  }

  if (user.status !== UserSubscriptionStatus.IN_TRIAL) return null

  const isUrgent = daysLeft <= 1
  const bgClass = isUrgent
    ? 'bg-amber-500'
    : 'bg-gradient-to-r from-indigo-600 to-purple-600'

  return (
    <div
      className={`relative flex items-center justify-center gap-3 px-4 py-2 text-sm text-white ${bgClass} rounded-md`}
    >
      <Clock className='h-4 w-4 shrink-0' />
      <span className='font-medium'>
        {daysLeft === 0
          ? 'Your trial ends today!'
          : daysLeft === 1
            ? '1 day left in your free trial'
            : `${daysLeft} days left in your free trial`}
        {user.subscription
          ? ` — you'll be charged on ${new Date(user.trialEndsAt!).toLocaleDateString()}.`
          : ' — Upgrade to keep your agents running.'}
      </span>
      <Button
        size='sm'
        variant='secondary'
        className='h-7 gap-1.5 bg-white/90 text-gray-900 hover:bg-white'
        asChild
      >
        <Link
          to='/pricing'
          onClick={() => posthog?.capture('trial_banner_upgrade_clicked')}
        >
          <Sparkles className='h-3.5 w-3.5' />
          View Plans
        </Link>
      </Button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className='absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-70 hover:opacity-100'
        >
          <X className='h-3.5 w-3.5' />
        </button>
      )}
    </div>
  )
}
