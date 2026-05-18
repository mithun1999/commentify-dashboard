import { createFileRoute, useParams } from '@tanstack/react-router'
import { AgentSettings } from '@/features/agent-system/components/agent-settings'
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
  if (agentType === 'linkedin-posting') {
    return <PostingOnboarding profileId={profileId} onComplete={() => {}} />
  }
  return <AgentSettings />
}
