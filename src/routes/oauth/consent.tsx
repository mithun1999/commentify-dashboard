import { createFileRoute } from '@tanstack/react-router'
import McpConsent from '@/features/ai-tools/consent'

export interface ConsentSearch {
  request: string
}

// Outside `_authenticated` on purpose: that layout's onboarding and plan
// redirects would take the user off this screen mid-connection.
export const Route = createFileRoute('/oauth/consent')({
  validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
    request: typeof search.request === 'string' ? search.request : '',
  }),
  component: ConsentRoute,
})

function ConsentRoute() {
  const { request } = Route.useSearch()
  return <McpConsent requestId={request} />
}
