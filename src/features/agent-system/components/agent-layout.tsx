import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCurrentAgent } from '../hooks/use-current-agent'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'

function statusLabel(status: ProfileStatusEnum) {
  switch (status) {
    case ProfileStatusEnum.OK:
      return 'Active'
    case ProfileStatusEnum.ACTION_REQUIRED:
      return 'Action Required'
    case ProfileStatusEnum.DEACTIVATED:
      return 'Deactivated'
    default:
      return status
  }
}

function statusVariant(
  status: ProfileStatusEnum
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case ProfileStatusEnum.OK:
      return 'default'
    case ProfileStatusEnum.ACTION_REQUIRED:
      return 'destructive'
    case ProfileStatusEnum.DEACTIVATED:
      return 'secondary'
    default:
      return 'outline'
  }
}

export function AgentLayout({ children }: { children: ReactNode }) {
  const { agent, agentTypeDef } = useCurrentAgent()
  const location = useLocation()

  if (!agent || !agentTypeDef) {
    return (
      <>
        <Header>
          <div className='ml-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <div className='flex flex-col items-center justify-center py-20'>
            <p className='text-muted-foreground'>Agent not found.</p>
            <Button asChild variant='link'>
              <Link to='/'>Back to Agent Hub</Link>
            </Button>
          </div>
        </Main>
      </>
    )
  }

  const Icon = agentTypeDef.icon
  const basePath = `/agents/${agent.profileId}/${agent.type}`
  const activeTab = location.pathname.endsWith('/settings')
    ? 'settings'
    : location.pathname.endsWith('/stats')
      ? 'stats'
      : 'queue'

  return (
    <>
      <Header>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/'>
              <IconArrowLeft className='size-4' />
            </Link>
          </Button>
          <Icon className='size-5' />
          <div>
            <h1 className='text-sm font-semibold leading-tight'>
              {agentTypeDef.name}
            </h1>
            <p className='text-muted-foreground text-xs'>
              {agent.profileName}
            </p>
          </div>
          <Badge variant={statusVariant(agent.status)}>
            {statusLabel(agent.status)}
          </Badge>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <Tabs value={activeTab} className='mb-6'>
          <TabsList>
            <TabsTrigger value='stats' asChild>
              <Link to={`${basePath}/stats` as string}>Stats</Link>
            </TabsTrigger>
            <TabsTrigger value='queue' asChild>
              <Link to={`${basePath}/queue` as string}>Queue</Link>
            </TabsTrigger>
            <TabsTrigger value='settings' asChild>
              <Link to={`${basePath}/settings` as string}>Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {children}
      </Main>
    </>
  )
}
