import { Link } from '@tanstack/react-router'
import { IconDotsVertical, IconSettings, IconRefresh } from '@tabler/icons-react'
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

function statusConfig(status: ProfileStatusEnum) {
  switch (status) {
    case ProfileStatusEnum.OK:
      return { label: 'Active', variant: 'default' as const, dot: 'bg-green-500' }
    case ProfileStatusEnum.ACTION_REQUIRED:
      return { label: 'Action Required', variant: 'destructive' as const, dot: 'bg-amber-500' }
    case ProfileStatusEnum.DEACTIVATED:
      return { label: 'Deactivated', variant: 'secondary' as const, dot: 'bg-gray-400' }
    default:
      return { label: status, variant: 'outline' as const, dot: 'bg-gray-400' }
  }
}

interface AgentCardProps {
  agent: DerivedAgent
}

export function AgentCard({ agent }: AgentCardProps) {
  const typeDef = getAgentType(agent.type)
  if (!typeDef) return null

  const Icon = typeDef.icon
  const status = statusConfig(agent.status)
  const queueUrl = `/agents/${agent.profileId}/${agent.type}/queue`
  const settingsUrl = `/agents/${agent.profileId}/${agent.type}/settings`

  return (
    <Card className='group relative transition-shadow hover:shadow-md'>
      <Link to={queueUrl as string} className='absolute inset-0 z-0' />
      <CardHeader className='flex flex-row items-start justify-between gap-2 pb-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-muted flex size-10 items-center justify-center rounded-lg'>
            <Icon className='size-5' />
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-semibold leading-tight'>
              {typeDef.name}
            </p>
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
              <DropdownMenuItem>
                <IconRefresh className='mr-2 size-4' />
                Reconnect
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='flex items-center gap-2'>
          <span
            className={cn('inline-block size-2 rounded-full', status.dot)}
          />
          <Badge variant={status.variant} className='text-xs'>
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
