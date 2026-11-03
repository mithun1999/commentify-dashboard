import { createFileRoute } from '@tanstack/react-router'
import AppsumoRedeem from '@/features/appsumo/redeem'

export interface AppsumoSearch {
  code?: string
}

// AppSumo's OAuth redirect URL. Outside `_authenticated` on purpose: buyers
// usually arrive signed out, and that layout's onboarding redirects would take
// a signed-in one off this screen before the license is linked. AppSumo also
// checks this URL answers 200 without redirecting.
export const Route = createFileRoute('/appsumo')({
  validateSearch: (search: Record<string, unknown>): AppsumoSearch => ({
    code:
      typeof search.code === 'string' && search.code ? search.code : undefined,
  }),
  component: AppsumoRoute,
})

function AppsumoRoute() {
  const { code } = Route.useSearch()
  return <AppsumoRedeem code={code} />
}
