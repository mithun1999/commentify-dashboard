import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/')({
  component: () => <Navigate to='/onboarding/agent-type' />,
})
