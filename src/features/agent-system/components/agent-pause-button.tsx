import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import type { IProfile } from '@/features/users/interface/profile.interface'
import {
  usePauseAgent,
  useResumeAgent,
} from '@/features/users/query/profile.query'
import { getAgentType } from '../registry'
import type { Platform } from '../types/agent.types'
import {
  formatNextRunRelative,
  getJobTiming,
  getNextRunTime,
} from '../utils/next-run'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface AgentPauseButtonProps {
  profileId: string
  profileName: string
  agentType: string
  status: ProfileStatusEnum
  isPaused: boolean
  platform: Platform
  profile?: IProfile | null
  showLabel?: boolean
  className?: string
}

export function AgentPauseButton({
  profileId,
  profileName,
  agentType,
  status,
  isPaused,
  platform,
  profile,
  showLabel = false,
  className,
}: AgentPauseButtonProps) {
  const [confirmPause, setConfirmPause] = useState(false)
  const { data: user } = useGetUserQuery()

  const isPostingAgent = getAgentType(agentType)?.capability === 'post'
  const workLabel = isPostingAgent ? 'posting' : 'commenting'

  const jobTiming = getJobTiming(profile?.setting, platform)
  const nextRunLabel =
    !isPostingAgent && jobTiming
      ? formatNextRunRelative(getNextRunTime(jobTiming))
      : null

  const { pauseAgent, isPausingAgent } = usePauseAgent({
    pausedWorkLabel: capitalize(workLabel),
    onSuccess: () => setConfirmPause(false),
  })
  const { resumeAgent, isResumingAgent } = useResumeAgent({ nextRunLabel })

  const canPause =
    status === ProfileStatusEnum.OK ||
    status === ProfileStatusEnum.NEEDS_ATTENTION

  // ACTION_REQUIRED needs a reconnect and DEACTIVATED needs a plan; both have
  // their own affordance elsewhere, so offering a pause toggle here would only
  // ever produce an error.
  if (!isPaused && !canPause) return null

  // Mirrors the backend's resume check exactly. The flip to TRIAL_EXPIRED rides
  // on a scheduled job, so a lapsed trial can still read IN_TRIAL — without the
  // date check the button promises a resume the API then refuses.
  const trialStillValid =
    user?.status !== UserSubscriptionStatus.IN_TRIAL ||
    !user?.trialEndsAt ||
    new Date(user.trialEndsAt) > new Date()
  const planActive =
    (user?.status === UserSubscriptionStatus.ACTIVE ||
      user?.status === UserSubscriptionStatus.IN_TRIAL) &&
    trialStillValid

  // The backend refuses to resume without an active plan, so send them to the
  // plans page rather than let them click into a guaranteed error.
  if (isPaused && !planActive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size={showLabel ? 'sm' : 'icon'}
            variant='outline'
            asChild
            className={className}
            onClick={(e) => e.stopPropagation()}
          >
            <Link to='/plans'>
              <IconPlayerPlay
                className={showLabel ? 'mr-1.5 size-4' : 'size-4'}
              />
              {showLabel ? (
                'Choose a plan'
              ) : (
                <span className='sr-only'>Choose a plan to resume</span>
              )}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Choose a plan to resume this agent</TooltipContent>
      </Tooltip>
    )
  }

  if (isPaused) {
    return (
      <Button
        size={showLabel ? 'sm' : 'icon'}
        variant='outline'
        className={className}
        disabled={isResumingAgent}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          resumeAgent({ profileId, agentType })
        }}
      >
        <IconPlayerPlay className={showLabel ? 'mr-1.5 size-4' : 'size-4'} />
        {showLabel ? 'Resume' : <span className='sr-only'>Resume agent</span>}
      </Button>
    )
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size={showLabel ? 'sm' : 'icon'}
            variant='outline'
            className={className}
            disabled={isPausingAgent}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setConfirmPause(true)
            }}
          >
            <IconPlayerPause
              className={showLabel ? 'mr-1.5 size-4' : 'size-4'}
            />
            {showLabel ? 'Pause' : <span className='sr-only'>Pause agent</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pause {workLabel}</TooltipContent>
      </Tooltip>

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause {workLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {[
                `${capitalize(workLabel)} for ${profileName} will stop. Your other agents on this profile keep running.`,
                isPostingAgent
                  ? 'Scheduled posts stay scheduled and go out once you resume.'
                  : 'Queued comments are cleared and rebuilt from fresh posts when you resume.',
                'Nothing is deleted and your plan slot is kept, so you can resume whenever you like.',
              ].join(' ')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pauseAgent({ profileId, agentType })}
              disabled={isPausingAgent}
            >
              Pause
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
