import { createFileRoute } from '@tanstack/react-router'
import Pricing from '@/features/pricing'

export const Route = createFileRoute('/_authenticated/pricing/')({
  component: Pricing,
})

// function RouteComponent() {
//   return <div>Hello "/_authenticated/pricing/"!</div>
// }
