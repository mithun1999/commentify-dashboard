import { createFileRoute, useParams } from '@tanstack/react-router'
import { AgentDangerZone } from '@/features/agent-system/components/agent-danger-zone'
import { AgentSettings } from '@/features/agent-system/components/agent-settings'
import { useCurrentAgent } from '@/features/agent-system/hooks/use-current-agent'
import {
  getAgentType,
  isPostingAgentSlug,
} from '@/features/agent-system/registry'
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
  if (isPostingAgentSlug(agentType)) {
    return (
      <>
        <PostingOnboarding
          profileId={profileId}
          platform={
            getAgentType(agentType)?.platform === 'twitter' ? 'twitter' : 'linkedin'
          }
          onComplete={() => {}}
        />
        {/* Same column as the posting settings above, not full width. */}
        <div className='mx-auto max-w-2xl pb-8'>
          <AgentDangerZone profile={profile ?? null} />
        </div>
      </>
    )
  }
  return <AgentSettings />
}
