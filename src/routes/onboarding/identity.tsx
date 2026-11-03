import { createFileRoute } from '@tanstack/react-router'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { AiKeyStep } from '@/features/onboarding/steps/ai-key-step'
import { IdentityStep } from '@/features/onboarding/steps/identity-step'

export const Route = createFileRoute('/onboarding/identity')({
  component: IdentityRoute,
})

// An AppSumo license ends setup on its AI key instead: we know where they
// found us, and the step after this one (the trial) does not apply to them.
function IdentityRoute() {
  const { data: user } = useGetUserQuery()
  return user?.appsumoTier ? <AiKeyStep /> : <IdentityStep />
}
