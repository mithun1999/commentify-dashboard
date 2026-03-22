import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useAgents } from '@/features/agent-system/hooks/use-agents'
import { AgentCard } from './components/agent-card'
import { AddAgentCard } from './components/add-agent-card'
import { AddAgentDialog } from './components/add-agent-dialog'
import { EmptyState } from './components/empty-state'

export default function AgentHub() {
  const { agents, isLoading } = useAgents()
  const { data: user } = useGetUserQuery()
  const posthog = usePostHog()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Agent Hub</h1>
            <p className='text-muted-foreground text-sm'>
              Manage your commenting agents across platforms.
            </p>
          </div>
        </div>

        {user?.status === UserSubscriptionStatus.TRIAL_EXPIRED && (
          <Alert className='mb-4 flex flex-col gap-2' variant='destructive'>
            <p className='text-md font-medium'>
              Your trial has expired. Choose a plan to keep your agents
              running.
            </p>
            <Button variant='destructive' size='sm' asChild>
              <Link
                to='/billing'
                onClick={() =>
                  posthog?.capture('upgrade_plan_hub_clicked')
                }
              >
                Upgrade
              </Link>
            </Button>
          </Alert>
        )}

        {!isLoading && agents.length === 0 ? (
          <EmptyState onAddAgent={() => setAddDialogOpen(true)} />
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
            <AddAgentCard onClick={() => setAddDialogOpen(true)} />
          </div>
        )}
      </Main>

      <AddAgentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  )
}
