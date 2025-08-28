import { createFileRoute } from '@tanstack/react-router'
import Billing from '@/features/billing/index'

export const Route = createFileRoute('/_authenticated/billing')({
  component: Billing,
})

