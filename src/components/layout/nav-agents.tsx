import { Link, useLocation } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAgents } from '@/features/agent-system/hooks/use-agents'
import { getAgentType } from '@/features/agent-system/registry'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'

function StatusDot({
  status,
  isPaused,
}: {
  status: ProfileStatusEnum
  isPaused: boolean
}) {
  const showsPaused = isPaused && status !== ProfileStatusEnum.ACTION_REQUIRED
  return (
    <span
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        showsPaused && 'bg-gray-400',
        !showsPaused && status === ProfileStatusEnum.OK && 'bg-green-500',
        status === ProfileStatusEnum.ACTION_REQUIRED && 'bg-amber-500',
        status === ProfileStatusEnum.DEACTIVATED && 'bg-gray-400',
        !showsPaused &&
          status === ProfileStatusEnum.NEEDS_ATTENTION &&
          'bg-amber-500'
      )}
    />
  )
}

export function NavAgents() {
  const { agents } = useAgents()
  const { setOpenMobile } = useSidebar()
  const href = useLocation({ select: (l) => l.href })

  return (
    <SidebarGroup>
      <SidebarGroupLabel>My Agents</SidebarGroupLabel>
      <SidebarMenu>
        {agents.map((agent) => {
          const typeDef = getAgentType(agent.type)
          if (!typeDef) return null
          const Icon = typeDef.icon
          const defaultTab = agent.type === 'linkedin-posting' ? 'calendar' : 'stats'
          const agentUrl = `/agents/${agent.profileId}/${agent.type}/${defaultTab}`
          const isActive = href.startsWith(
            `/agents/${agent.profileId}/${agent.type}`
          )

          return (
            <SidebarMenuItem key={agent.id}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={`${typeDef.name} - ${agent.profileName}`}
              >
                <Link to={agentUrl} onClick={() => setOpenMobile(false)}>
                  <Icon className='size-4 shrink-0' />
                  <span className='truncate'>
                    {agent.profileName}
                    <span className='text-muted-foreground ml-1 text-[10px]'>
                      {agent.type.includes('posting') ? 'Posting' : 'Commenting'}
                    </span>
                  </span>
                  <StatusDot status={agent.status} isPaused={agent.isPaused} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip='Add Agent'
          >
            <Link to='/' onClick={() => setOpenMobile(false)}>
              <IconPlus className='size-4' />
              <span>Add Agent</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
