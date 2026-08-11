import { createFileRoute } from '@tanstack/react-router'
import { CopilotHome } from '@/features/copilot/components/copilot-home'

export const Route = createFileRoute('/_authenticated/copilot/')({
  component: CopilotHome,
})
