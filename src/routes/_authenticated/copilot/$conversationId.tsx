import { createFileRoute } from '@tanstack/react-router'
import { CopilotPage } from '@/features/copilot/components/copilot-page'
import { CopilotThread } from '@/features/copilot/components/copilot-thread'

export const Route = createFileRoute('/_authenticated/copilot/$conversationId')(
  {
    component: RouteComponent,
  }
)

function RouteComponent() {
  const { conversationId } = Route.useParams()

  return (
    <CopilotPage showNewChat>
      {/* Keyed so switching threads builds fresh chat state rather than
          carrying the previous thread's messages into the new one. */}
      <CopilotThread key={conversationId} conversationId={conversationId} />
    </CopilotPage>
  )
}
