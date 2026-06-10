import { createFileRoute } from '@tanstack/react-router'
import Plans from '@/features/plans/index'

export interface PlansSearch {
  agent?: 'comment' | 'post'
  tier?: 'starter' | 'pro'
  interval?: 'monthly' | 'yearly'
  /** Marketing "Power Bundle" deep-link: preselects both agents. */
  bundle?: boolean
}

export const Route = createFileRoute('/_authenticated/plans/')({
  validateSearch: (search: Record<string, unknown>): PlansSearch => ({
    agent: search.agent === 'comment' || search.agent === 'post' ? search.agent : undefined,
    tier: search.tier === 'starter' || search.tier === 'pro' ? search.tier : undefined,
    interval:
      search.interval === 'monthly' || search.interval === 'yearly'
        ? search.interval
        : undefined,
    bundle: search.bundle === '1' || search.bundle === true || search.bundle === 'true',
  }),
  component: Plans,
})
