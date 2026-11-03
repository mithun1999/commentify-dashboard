import { createFileRoute, Navigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { ActivateTrialStep } from '@/features/onboarding/steps/activate-trial-step'

const searchSchema = z.object({
  status: z.string().optional(),
  subscription_id: z.string().optional(),
  payment_id: z.string().optional(),
  email: z.string().optional(),
})

export const Route = createFileRoute('/onboarding/activate-trial')({
  validateSearch: searchSchema,
  component: ActivateTrialRoute,
})

function ActivateTrialRoute() {
  const { data: user } = useGetUserQuery()
  // An AppSumo license is already the plan: there is no trial to start.
  if (user?.appsumoTier) return <Navigate to='/onboarding/identity' replace />
  return <ActivateTrialStep />
}
