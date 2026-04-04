import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ActivateTrialStep } from '@/features/onboarding/steps/activate-trial-step'

const searchSchema = z.object({
  status: z.string().optional(),
  subscription_id: z.string().optional(),
  payment_id: z.string().optional(),
  email: z.string().optional(),
})

export const Route = createFileRoute('/onboarding/activate-trial')({
  validateSearch: searchSchema,
  component: () => <ActivateTrialStep />,
})
