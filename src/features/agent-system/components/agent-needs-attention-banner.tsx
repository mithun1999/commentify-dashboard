import { Link } from '@tanstack/react-router'
import { AlertTriangle, Settings2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ProfileBlockedReasonEnum,
  ProfileStatusEnum,
} from '@/features/users/enum/profile.enum'
import type { IProfile } from '@/features/users/interface/profile.interface'

function copyFor(
  reason: ProfileBlockedReasonEnum | undefined,
  platformLabel: string
): { title: string; body: string } {
  switch (reason) {
    case ProfileBlockedReasonEnum.NO_KEYWORDS:
    case ProfileBlockedReasonEnum.NO_SEARCH_TERMS:
      return {
        title: 'Add keywords to start commenting',
        body: `Your agent has no keywords to search for, so it has nothing to comment on. Add a few topics your audience posts about and it will pick them up on the next run.`,
      }
    case ProfileBlockedReasonEnum.KEYWORDS_TOO_NARROW:
      return {
        title: 'Your keywords are not finding posts',
        body: `${platformLabel} returned no recent posts for your current keywords. Broadening them, or adding a couple of related topics, should give the agent something to work with.`,
      }
    case ProfileBlockedReasonEnum.FILTER_TOO_STRICT:
      return {
        title: 'Posts are being found but filtered out',
        body: `Your agent found posts but none matched your targeting rules, so nothing was queued. Relaxing the audience filters or widening your keywords will let more through.`,
      }
    case ProfileBlockedReasonEnum.SETTINGS_INVALID:
      return {
        title: 'Your agent settings need a look',
        body: `Your agent could not run with its current settings. Opening settings and saving them again usually clears this.`,
      }
    default:
      return {
        title: 'Your agent needs attention',
        body: `Your agent could not produce any comments on its recent runs. Check its settings to get it running again.`,
      }
  }
}

export function AgentNeedsAttentionBanner({
  profile,
  settingsPath,
}: {
  profile: IProfile
  settingsPath?: string
}) {
  if (profile.status !== ProfileStatusEnum.NEEDS_ATTENTION) return null

  const platformLabel = profile.platform === 'twitter' ? 'X' : 'LinkedIn'
  const { title, body } = copyFor(profile.blockedReason, platformLabel)

  return (
    <Alert className='mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20'>
      <AlertTriangle className='text-amber-600' />
      <AlertTitle className='text-amber-800 dark:text-amber-300'>
        {title}
      </AlertTitle>
      <AlertDescription>
        <p>{body}</p>
        {settingsPath && (
          <div className='mt-3'>
            <Button size='sm' variant='outline' asChild>
              <Link to={settingsPath}>
                <Settings2 className='mr-1.5 size-3.5' />
                Open settings
              </Link>
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
