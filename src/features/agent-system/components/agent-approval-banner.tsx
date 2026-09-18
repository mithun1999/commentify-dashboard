import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  usePendingApprovalCount,
  useOnboardingPreviewCount,
} from '../query/agent-run.query'

// Non-blocking nudge: posts produced by in-run keyword broadening land as
// PENDING (not auto-scheduled) and wait for the user to review them. Count is a
// LIVE query on the tagged posts, so it disappears once they're approved.
//
// Onboarding-preview drafts are counted separately and take precedence. They
// were written before the card went on and the user was told they would wait
// in the queue, so the explanation they need is different.
export function AgentApprovalBanner({
  profileId,
  queueHref,
}: {
  profileId: string
  queueHref: string
}) {
  const { data: broadened } = usePendingApprovalCount(profileId)
  const { data: preview } = useOnboardingPreviewCount(profileId)

  const previewCount = preview?.count ?? 0
  const broadenedCount = broadened?.count ?? 0

  if (previewCount > 0) {
    const one = previewCount === 1
    return (
      <Banner
        queueHref={queueHref}
        title={`${previewCount} ${one ? 'comment' : 'comments'} from your setup, ready to publish`}
        cta={one ? 'Approve it' : 'Approve them'}
      >
        Your agent wrote {one ? 'this comment' : 'these comments'} while you
        were setting up. Approve {one ? 'it' : 'them'} to make{' '}
        {one ? 'it' : 'them'} live.
      </Banner>
    )
  }

  if (broadenedCount > 0) {
    const one = broadenedCount === 1
    return (
      <Banner
        queueHref={queueHref}
        title={`${broadenedCount} ${one ? 'comment' : 'comments'} awaiting your review`}
        cta='Review queue'
      >
        Your keywords were too narrow, so we broadened them and drafted{' '}
        {one ? 'a comment' : 'these comments'} for you. Review{' '}
        {one ? 'it' : 'them'} before {one ? 'it goes' : 'they go'} live.
      </Banner>
    )
  }

  return null
}

function Banner({
  title,
  cta,
  queueHref,
  children,
}: {
  title: string
  cta: string
  queueHref: string
  children: React.ReactNode
}) {
  return (
    <Alert className='mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20'>
      <Sparkles className='text-blue-600' />
      <AlertTitle className='text-blue-800 dark:text-blue-300'>
        {title}
      </AlertTitle>
      <AlertDescription>
        <p>{children}</p>
        <div className='mt-3'>
          <Button asChild size='sm' variant='outline'>
            <Link to={queueHref as string}>{cta}</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
