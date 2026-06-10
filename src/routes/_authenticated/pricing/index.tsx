import { createFileRoute, redirect } from '@tanstack/react-router'

// Legacy route. The two-agent catalog lives on /plans now; keep this path as a
// permanent redirect so old links/bookmarks land on the maintained page.
export const Route = createFileRoute('/_authenticated/pricing/')({
  beforeLoad: () => {
    throw redirect({ to: '/plans' })
  },
})
