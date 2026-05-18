import { type ReactNode, useMemo } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { IconArrowLeft, IconClock } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCurrentAgent } from '../hooks/use-current-agent'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { AgentReconnectBanner } from './agent-reconnect-banner'
import { useOnboardingStatus } from '@/features/post-generator/query/post-generator.query'
import { PostingOnboarding } from '@/features/post-generator/components/posting-onboarding'
import {
  getJobTiming,
  getNextRunTime,
  formatNextRunRelative,
} from '../utils/next-run'

const COMMENTING_TABS = [
  { value: 'stats', label: 'Stats' },
  { value: 'queue', label: 'Queue' },
  { value: 'settings', label: 'Settings' },
]

const POSTING_TABS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'history', label: 'History' },
  { value: 'settings', label: 'Settings' },
]

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
  const { agent, profile, agentTypeDef } = useCurrentAgent()
  const location = useLocation()
  const navigate = useNavigate()

  const isPostingAgent = agent?.type === 'linkedin-posting'
  const { data: onboardingStatus, isLoading: isLoadingOnboarding } =
    useOnboardingStatus(isPostingAgent ? agent?.profileId : undefined)
  const onboardingComplete = !isPostingAgent || onboardingStatus?.completed

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
  const jobTiming = getJobTiming(profile?.setting, agent.platform)
  const nextRunLabel = useMemo(() => {
    if (agent.status !== ProfileStatusEnum.OK || !jobTiming) return null
    return formatNextRunRelative(getNextRunTime(jobTiming))
  }, [agent.status, jobTiming])
  const tabs = isPostingAgent ? POSTING_TABS : COMMENTING_TABS
  const defaultTab = isPostingAgent ? 'calendar' : 'queue'

  const activeTab = tabs.reduce((match, tab) => {
    if (location.pathname.endsWith(`/${tab.value}`)) return tab.value
    return match
  }, defaultTab)

  if (isPostingAgent && !isLoadingOnboarding && !onboardingComplete) {
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
          </div>
          <div className='ml-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <PostingOnboarding
            profileId={agent.profileId}
            onComplete={() =>
              navigate({
                to: `${basePath}/calendar` as string,
              })
            }
          />
        </Main>
      </>
    )
  }

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
          {nextRunLabel && (
            <span className='text-muted-foreground flex items-center gap-1 text-xs'>
              <IconClock className='size-3.5' />
              Next run {nextRunLabel}
            </span>
          )}
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <Tabs value={activeTab} className='mb-6'>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} asChild>
                <Link to={`${basePath}/${tab.value}` as string}>
                  {tab.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {profile && <AgentReconnectBanner profile={profile} />}
        {children}
      </Main>
    </>
  )
}
