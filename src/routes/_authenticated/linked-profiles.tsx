import { createFileRoute } from '@tanstack/react-router'
import LinkedProfilesPage from '@/features/profile-links/linked-profiles-page'

export const Route = createFileRoute('/_authenticated/linked-profiles')({
  component: LinkedProfilesPage,
})
