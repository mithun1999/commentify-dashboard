import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { usePendingApprovalCount } from '../query/agent-run.query'

// Non-blocking nudge: posts produced by in-run keyword broadening land as
// PENDING (not auto-scheduled) and wait for the user to review them. Count is a
// LIVE query on the tagged posts, so it disappears once they're approved.
export function AgentApprovalBanner({
  profileId,
  queueHref,
}: {
  profileId: string
  queueHref: string
}) {
  const { data } = usePendingApprovalCount(profileId)
  const count = data?.count ?? 0

  if (count <= 0) return null

  return (
    <Alert className='mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20'>
      <Sparkles className='text-blue-600' />
      <AlertTitle className='text-blue-800 dark:text-blue-300'>
        {count} {count === 1 ? 'comment' : 'comments'} awaiting your review
      </AlertTitle>
      <AlertDescription>
        <p>
          Your keywords were too narrow, so we broadened them and drafted{' '}
          {count === 1 ? 'a comment' : 'these comments'} for you. Review{' '}
          {count === 1 ? 'it' : 'them'} before {count === 1 ? 'it goes' : 'they go'}{' '}
          live.
        </p>
        <div className='mt-3'>
          <Button asChild size='sm' variant='outline'>
            <Link to={queueHref as string}>Review queue</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
