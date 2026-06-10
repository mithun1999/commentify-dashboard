'use client'

import { useState } from 'react'
import { Crisp } from 'crisp-sdk-web'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useAgents } from '@/features/agent-system/hooks/use-agents'
import { getAgentPlanTier } from '@/features/agent-system/registry'
import { isLegacyProduct } from '@/features/pricing/utils/prices.util'
import { useGetCustomerPortalUrlQuery } from '@/features/subscription/query/subscription.query'
import { CancelSubscriptionDialog } from './components/cancel-subscription-dialog'
import { PostCreditsCard } from './components/post-credits-card'

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Billing() {
  const { data: user } = useGetUserQuery()
  const { agents } = useAgents()
  const navigate = useNavigate()
  const [cancelOpen, setCancelOpen] = useState(false)
  const isLegacy = isLegacyProduct(user?.subscribedProduct)
  const isCancelled = Boolean(user?.subscription?.isCancelled)
  const canCancel = Boolean(user?.subscription) && !isCancelled
  // The optimistic cancel doesn't set endsAt until the provider webhook lands,
  // so fall back to the next renewal date (= when access actually ends).
  const cancelDate = formatDate(
    user?.subscription?.endsAt || user?.subscription?.renewsAt
  )
  const commentingUsed = agents.filter((a) =>
    a.type.includes('commenting')
  ).length
  const postingUsed = agents.filter((a) => a.type.includes('posting')).length
  const commentMax =
    user?.agents?.comment?.profiles ?? user?.subscription?.quantity ?? 1
  const postMax = user?.agents?.post?.profiles ?? 1

  const agentRows: {
    key: string
    label: string
    tier?: string
    used: number
    max?: number
  }[] = []
  if (user?.agents?.comment?.active || commentingUsed > 0) {
    agentRows.push({
      key: 'comment',
      label: 'Commenting',
      tier: user?.agents?.comment?.tier,
      used: commentingUsed,
      max: commentMax,
    })
  }
  if (user?.agents?.post?.active || postingUsed > 0) {
    agentRows.push({
      key: 'post',
      label: 'Posting',
      tier: user?.agents?.post?.tier,
      used: postingUsed,
      max: postMax,
    })
  }

  // Contextual upsell: surface upgrade (Starter → Pro) and cross-sell (add the
  // missing agent) opportunities so plans stay discoverable from Billing without
  // duplicating the /plans page. Hidden for legacy plans (handled separately).
  const commentPresent =
    Boolean(user?.agents?.comment?.active) || commentingUsed > 0
  const postPresent = Boolean(user?.agents?.post?.active) || postingUsed > 0
  const upsells: { key: string; title: string; desc: string; cta: string }[] = []
  if (!isLegacy) {
    if (commentPresent && getAgentPlanTier(user, 'comment') === 'starter') {
      upsells.push({
        key: 'comment-pro',
        title: 'Upgrade Commenting to Pro',
        desc: 'Unlock monitored profiles, higher daily limits, and more.',
        cta: 'Upgrade',
      })
    }
    if (postPresent && getAgentPlanTier(user, 'post') === 'starter') {
      upsells.push({
        key: 'post-pro',
        title: 'Upgrade Posting to Pro',
        desc: 'Unlock AI carousels, advanced analytics, and more.',
        cta: 'Upgrade',
      })
    }
    if (!commentPresent) {
      upsells.push({
        key: 'add-comment',
        title: 'Add the Commenting agent',
        desc: postPresent
          ? 'Find and comment on relevant posts to grow reach — 20% off as a bundle.'
          : 'Find and comment on relevant posts to grow reach.',
        cta: 'Add',
      })
    }
    if (!postPresent) {
      upsells.push({
        key: 'add-post',
        title: 'Add the Posting agent',
        desc: commentPresent
          ? 'AI content calendar that drafts, refines, and publishes — 20% off as a bundle.'
          : 'AI content calendar that drafts, refines, and publishes posts.',
        cta: 'Add',
      })
    }
  }

  const { data: portal, isLoading } = useGetCustomerPortalUrlQuery({
    // @ts-expect-error shared hook expects a user, placeholder handled inside
    user,
  })

  const searchParams = new URLSearchParams(window.location.search)
  const paymentStatus = searchParams.get('status')

  const handleChatSupportClick = () => {
    if (Crisp.isCrispInjected()) {
      Crisp.chat.open()
    } else {
      window.open('mailto:support@commentify.co', '_blank')
    }
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
        <div className='mb-2 flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Billing</h2>
        </div>

        {paymentStatus === 'active' && (
          <Alert className='mt-4 border-green-500/40 bg-green-500/5'>
            <CheckCircle2 className='h-4 w-4 text-green-500' />
            <AlertTitle>Payment Successful</AlertTitle>
            <AlertDescription>
              Your payment was successful. We’re updating your subscription…
              this might take a few minutes.
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === 'failed' && (
          <Alert variant='destructive' className='mt-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Payment Failed</AlertTitle>
            <AlertDescription>
              Your payment could not be processed. Please try again. If you
              continue to experience issues, please contact support.
            </AlertDescription>
          </Alert>
        )}

        <Alert className='border-primary/40 bg-primary/5 mt-4'>
          <AlertTitle>Need help with billing?</AlertTitle>
          <AlertDescription className='text-sm'>
            <p>
              If you face any issues, reach out via chat or email us at{' '}
              <a
                href='mailto:support@commentify.co'
                className='text-primary font-medium underline underline-offset-2'
              >
                support@commentify.co
              </a>
                .
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                size='sm'
                variant='secondary'
                className='gap-2'
                onClick={handleChatSupportClick}
              >
                <MessageSquare className='h-4 w-4' />
                Chat with us
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-5'>
            {agentRows.length === 0 && (
              <p className='text-muted-foreground text-sm'>
                No active agents yet.
              </p>
            )}
            {agentRows.map((row) => (
              <div key={row.key}>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <p className='font-medium'>{row.label}</p>
                    {row.tier && (
                      <Badge variant='secondary' className='capitalize'>
                        {row.tier}
                      </Badge>
                    )}
                  </div>
                  {row.max != null ? (
                    <div className='flex items-center gap-3'>
                      <span className='text-muted-foreground text-sm'>
                        {row.used} of {row.max}{' '}
                        {row.max === 1 ? 'profile' : 'profiles'}
                      </span>
                      <div className='bg-muted h-3 w-32 overflow-hidden rounded-full'>
                        <div
                          className='bg-primary h-full rounded-full transition-all'
                          style={{
                            width: `${Math.min((row.used / Math.max(row.max, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className='text-muted-foreground text-sm'>
                      {row.used} {row.used === 1 ? 'profile' : 'profiles'}
                    </span>
                  )}
                </div>
                {row.max != null && row.used >= row.max && (
                  <p className='mt-2 text-sm text-amber-600'>
                    You&apos;ve used all your {row.label.toLowerCase()} profile
                    slots. Upgrade your plan or add more slots to run another
                    profile.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {upsells.length > 0 && (
          <Card className='border-primary/30 bg-primary/5 mt-6'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Sparkles className='text-primary h-5 w-5' />
                Get more from your plan
              </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              {upsells.map((u) => (
                <div
                  key={u.key}
                  className='bg-background flex items-center justify-between gap-3 rounded-lg border px-4 py-3'
                >
                  <div>
                    <p className='font-medium'>{u.title}</p>
                    <p className='text-muted-foreground text-sm'>{u.desc}</p>
                  </div>
                  <Button
                    size='sm'
                    className='shrink-0 gap-1'
                    onClick={() => navigate({ to: '/plans' })}
                  >
                    {u.cta}
                    <ArrowUpRight className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className='mt-6 grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-muted-foreground text-sm'>
                    Current plan
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-base font-medium'>
                      {user?.subscribedProduct?.name || '—'}
                    </span>
                    {isLegacy && (
                      <Badge
                        variant='secondary'
                        className='border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      >
                        Legacy
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='flex items-center gap-1 text-sm'>
                  {isCancelled ? (
                    <>
                      <XCircle className='h-4 w-4 text-amber-500' />
                      <span className='text-amber-600 dark:text-amber-400'>
                        Canceling
                      </span>
                    </>
                  ) : user?.status === 'active' ? (
                    <>
                      <CheckCircle2 className='h-4 w-4 text-green-500' />
                      <span className='text-green-600 dark:text-green-400'>
                        Active
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className='h-4 w-4 text-amber-500' />
                      <span className='text-amber-600 capitalize dark:text-amber-400'>
                        {user?.status || 'inactive'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isCancelled && (
                <Alert className='border-amber-500/40 bg-amber-500/5'>
                  <AlertCircle className='h-4 w-4 text-amber-500' />
                  <AlertTitle>Scheduled to cancel</AlertTitle>
                  <AlertDescription className='text-sm'>
                    {cancelDate
                      ? `Your subscription is scheduled to cancel on ${cancelDate}. You'll keep full access until then.`
                      : `Your subscription is scheduled to cancel at the end of your current billing period. You'll keep full access until then.`}
                  </AlertDescription>
                </Alert>
              )}

              {isLegacy && (
                <p className='text-muted-foreground text-xs'>
                  You&apos;re on a legacy plan. You can keep it as-is, or switch
                  to the new two-agent plans anytime.
                </p>
              )}

              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <div className='flex flex-wrap gap-3'>
                  <Button
                    disabled={!portal?.customerPortal}
                    onClick={() =>
                      portal?.customerPortal &&
                      window.open(portal.customerPortal, '_blank')
                    }
                  >
                    Open Customer Portal
                    <ExternalLink className='ml-2 h-4 w-4' />
                  </Button>

                  <Button
                    variant='outline'
                    onClick={() => {
                      navigate({ to: '/plans' })
                    }}
                  >
                    Change Plan
                  </Button>
                </div>
              )}

              {canCancel && (
                <button
                  type='button'
                  onClick={() => setCancelOpen(true)}
                  className='text-muted-foreground/60 hover:text-muted-foreground mt-1 self-start text-xs underline underline-offset-2 transition-colors'
                >
                  Cancel subscription
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className='flex items-center gap-3'>
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Button
                  variant='outline'
                  disabled={!portal?.updatePaymentMethod}
                  onClick={() =>
                    portal?.updatePaymentMethod &&
                    window.open(portal.updatePaymentMethod, '_blank')
                  }
                >
                  Update Card
                  <ExternalLink className='ml-2 h-4 w-4' />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <PostCreditsCard />
      </Main>

      <CancelSubscriptionDialog open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  )
}
