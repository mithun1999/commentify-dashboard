import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconDotsVertical,
  IconSettings,
  IconRefresh,
  IconMessageCheck,
  IconSend,
  IconPlayerPause,
  IconPlayerPlay,
} from '@tabler/icons-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getAgentType } from '@/features/agent-system/registry'
import type { DerivedAgent } from '@/features/agent-system/types/agent.types'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import {
  useDeactivateProfile,
  useGetPostStats,
  useGetPostingStats,
  useReactivateProfile,
} from '@/features/users/query/profile.query'

function statusConfig(status: ProfileStatusEnum) {
  switch (status) {
    case ProfileStatusEnum.OK:
      return { label: 'Active', variant: 'default' as const, dot: 'bg-green-500' }
    case ProfileStatusEnum.ACTION_REQUIRED:
      return { label: 'Action Required', variant: 'destructive' as const, dot: 'bg-amber-500' }
    case ProfileStatusEnum.DEACTIVATED:
      return { label: 'Deactivated', variant: 'secondary' as const, dot: 'bg-gray-400' }
    case ProfileStatusEnum.NEEDS_ATTENTION:
      return { label: 'Needs Attention', variant: 'outline' as const, dot: 'bg-amber-500' }
    default:
      return { label: status, variant: 'outline' as const, dot: 'bg-gray-400' }
  }
}

interface AgentCardProps {
  agent: DerivedAgent
}

export function AgentCard({ agent }: AgentCardProps) {
  const typeDef = getAgentType(agent.type)
  const isPosting = agent.type === 'linkedin-posting'
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const { deactivateProfile, isDeactivatingProfile } = useDeactivateProfile()
  const { reactivateProfile } = useReactivateProfile()
  const { data: commentingStats } = useGetPostStats(
    !isPosting ? agent.profileId : undefined,
  )
  const { data: postingStats } = useGetPostingStats(
    isPosting ? agent.profileId : undefined,
  )
  if (!typeDef) return null

  const isDeactivated = agent.status === ProfileStatusEnum.DEACTIVATED

  const Icon = typeDef.icon
  const status = statusConfig(agent.status)
  const defaultTab = isPosting ? 'calendar' : 'stats'
  const agentUrl = `/agents/${agent.profileId}/${agent.type}/${defaultTab}`
  const settingsUrl = `/agents/${agent.profileId}/${agent.type}/settings`
  const showModeBadge = agent.type === 'linkedin-commenting'

  const metric = isPosting
    ? postingStats
      ? {
          icon: IconSend,
          label: `${postingStats.published.toLocaleString()} published`,
        }
      : null
    : commentingStats
      ? {
          icon: IconMessageCheck,
          label: `${commentingStats.completed.toLocaleString()} commented`,
        }
      : null

  return (
    <>
    <Card className='group relative transition-shadow hover:shadow-md'>
      <Link to={agentUrl as string} className='absolute inset-0 z-0' />
      <CardHeader className='flex flex-row items-start justify-between gap-2 pb-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-muted flex size-10 items-center justify-center rounded-lg'>
            <Icon className='size-5' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5'>
              <p className='text-sm font-semibold leading-tight'>
                {typeDef.name}
              </p>
              {showModeBadge && (
                <Badge
                  variant='outline'
                  className={cn(
                    'text-[10px] leading-tight',
                    agent.agentMode === 'sales'
                      ? 'border-orange-500/30 text-orange-600'
                      : 'border-blue-500/30 text-blue-600'
                  )}
                >
                  {agent.agentMode === 'sales' ? 'Sales' : 'Branding'}
                </Badge>
              )}
            </div>
            <p className='text-muted-foreground truncate text-xs'>
              {agent.profileName}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='relative z-10 size-8'
            >
              <IconDotsVertical className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem asChild>
              <Link to={settingsUrl as string}>
                <IconSettings className='mr-2 size-4' />
                Settings
              </Link>
            </DropdownMenuItem>
            {agent.status === ProfileStatusEnum.ACTION_REQUIRED && (
              <DropdownMenuItem asChild>
                <Link to={agentUrl as string}>
                  <IconRefresh className='mr-2 size-4' />
                  Reconnect
                </Link>
              </DropdownMenuItem>
            )}
            {isDeactivated ? (
              <DropdownMenuItem
                onSelect={() => reactivateProfile(agent.profileId)}
              >
                <IconPlayerPlay className='mr-2 size-4' />
                Reactivate
              </DropdownMenuItem>
            ) : (
              agent.status === ProfileStatusEnum.OK && (
                <DropdownMenuItem
                  onSelect={() => setConfirmDeactivate(true)}
                  className='text-amber-600 focus:text-amber-600'
                >
                  <IconPlayerPause className='mr-2 size-4' />
                  Deactivate
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span
              className={cn('inline-block size-2 rounded-full', status.dot)}
            />
            <Badge variant={status.variant} className='text-xs'>
              {status.label}
            </Badge>
          </div>
          {metric && (
            <div className='text-muted-foreground flex items-center gap-1 text-xs'>
              <metric.icon className='size-3.5' />
              <span>{metric.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              {typeDef.name} for {agent.profileName} will stop running until you
              reactivate it. You can reactivate anytime, as long as your plan
              still has room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateProfile(agent.profileId)}
              disabled={isDeactivatingProfile}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
