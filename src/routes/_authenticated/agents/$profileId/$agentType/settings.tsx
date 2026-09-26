import { createFileRoute, useParams } from '@tanstack/react-router'
import { AgentDangerZone } from '@/features/agent-system/components/agent-danger-zone'
import { AgentSettings } from '@/features/agent-system/components/agent-settings'
import { useCurrentAgent } from '@/features/agent-system/hooks/use-current-agent'
import { PostingOnboarding } from '@/features/post-generator/components/posting-onboarding'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/settings'
)({
  component: SettingsRouter,
})

function SettingsRouter() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
  }
  const { profile } = useCurrentAgent()
  if (agentType === 'linkedin-posting') {
    return (
      <>
        <PostingOnboarding profileId={profileId} onComplete={() => {}} />
        <AgentDangerZone profile={profile ?? null} />
      </>
    )
  }
  return <AgentSettings />
}
