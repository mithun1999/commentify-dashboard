import { createFileRoute } from '@tanstack/react-router'
import UpdatePassword from '@/features/auth/update-password'

export const Route = createFileRoute('/(auth)/update-password')({
  component: UpdatePassword,
})
