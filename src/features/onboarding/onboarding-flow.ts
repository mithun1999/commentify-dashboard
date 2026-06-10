import type { AgentType } from '@/features/auth/interface/user.interface'

export interface OnboardingStepDef {
  path: string
  /** Last path segment, used for completion tracking + matching. */
  key: string
  label: string
  message: string
  /** Whether this step shows in the top progress bar (pre-trial setup only). */
  bar: boolean
}

/**
 * Single source of truth for the onboarding sequence. The step list adapts to the
 * capabilities the user picked in the agent-type step:
 *   - comment: adds Scrape Settings → Comment Settings
 *   - post only / nothing chosen yet: shows only the common setup steps
 * "About You" and "Start Trial" are part of the flow but excluded from the bar.
 */
export function buildOnboardingFlow(
  capabilities: AgentType[] = []
): OnboardingStepDef[] {
  const wantsComment = capabilities.includes('comment')

  const steps: OnboardingStepDef[] = [
    {
      path: '/onboarding/extension',
      key: 'extension',
      label: 'Install Extension',
      message: 'Kick things off by installing the extension',
      bar: true,
    },
    {
      path: '/onboarding/agent-type',
      key: 'agent-type',
      label: 'Choose Agent',
      message: 'Pick the platform you want to engage on',
      bar: true,
    },
    {
      path: '/onboarding/connect-account',
      key: 'connect-account',
      label: 'Connect Account',
      message: 'Connect your social account to get started',
      bar: true,
    },
  ]

  if (wantsComment) {
    steps.push(
      {
        path: '/onboarding/post-settings',
        key: 'post-settings',
        label: 'Scrape Settings',
        message: 'Configure what posts your agent should target',
        bar: true,
      },
      {
        path: '/onboarding/comment-settings',
        key: 'comment-settings',
        label: 'Comment Settings',
        message: 'Define your comment style and tone',
        bar: true,
      }
    )
  }

  steps.push(
    {
      path: '/onboarding/identity',
      key: 'identity',
      label: 'About You',
      message: 'Tell us a bit about you',
      bar: false,
    },
    {
      path: '/onboarding/activate-trial',
      key: 'activate-trial',
      label: 'Start Trial',
      message: 'Start your free trial',
      bar: false,
    }
  )

  return steps
}

/** Steps shown in the progress bar for the chosen capabilities. */
export function getProgressSteps(capabilities: AgentType[] = []): OnboardingStepDef[] {
  return buildOnboardingFlow(capabilities).filter((s) => s.bar)
}

const normalize = (pathname: string) => pathname.replace(/\/+$/, '')

/** Prev/next paths for the current route, derived from the capability-aware flow. */
export function getStepNav(
  capabilities: AgentType[],
  currentPath: string
): { prev?: string; next?: string } {
  const flow = buildOnboardingFlow(capabilities)
  const current = normalize(currentPath)
  const idx = flow.findIndex((s) => normalize(s.path) === current)
  if (idx < 0) return {}
  return {
    prev: idx > 0 ? flow[idx - 1].path : undefined,
    next: idx < flow.length - 1 ? flow[idx + 1].path : undefined,
  }
}
