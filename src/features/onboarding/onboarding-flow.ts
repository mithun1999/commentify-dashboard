import type { OnboardingPlatform } from '@/stores/onboarding.store'

export type OnboardingStepKey =
  | 'agent-type'
  | 'extension'
  | 'connect-account'
  | 'preview'
  | 'post-settings'
  | 'comment-settings'
  | 'identity'
  | 'activate-trial'

export interface OnboardingStepDef {
  path: string
  key: OnboardingStepKey
  label: string
  message: string
  /** Whether this step shows in the top progress bar (pre-trial setup only). */
  bar: boolean
}

/**
 * Which onboarding an account is in.
 *
 * The agent slug saved against the account wins, because it outlives the
 * browser store that a returning user can easily arrive without. The wizard's
 * own pick covers the window between choosing a platform and that choice
 * reaching the server.
 */
export function platformFor(
  savedAgentType?: string | null,
  picked?: OnboardingPlatform | null
): OnboardingPlatform {
  if (savedAgentType) {
    return savedAgentType.startsWith('twitter') ? 'twitter' : 'linkedin'
  }
  return picked ?? 'linkedin'
}

/**
 * Single source of truth for the onboarding sequence.
 *
 * Agent type comes first because it is the only step that costs the user
 * nothing and tells us everything: the Chrome install and the account
 * connection both read better once someone has said what they came for.
 *
 * The two platforms diverge after connecting. LinkedIn goes to the preview,
 * which derives targeting and comment style from the profile and then shows
 * the agent actually working - every field the old forms asked for either had
 * a sensible default or was already being filled in by the same analysis.
 *
 * X keeps those forms. The preview reads LinkedIn specifically, from the
 * customer's own LinkedIn session, and there is no X equivalent of it; sending
 * an X account down that path searches the wrong network with credentials it
 * does not have. Until that exists, an X user says what to target rather than
 * being shown it.
 */
export function buildOnboardingFlow(
  platform: OnboardingPlatform = 'linkedin'
): OnboardingStepDef[] {
  const steps: OnboardingStepDef[] = [
    {
      path: '/onboarding/agent-type',
      key: 'agent-type',
      label: 'Choose Agent',
      message: 'Pick the platform you want to engage on',
      bar: true,
    },
    {
      path: '/onboarding/extension',
      key: 'extension',
      label: 'Install Extension',
      message: 'Install the extension so your agent can act for you',
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

  if (platform === 'twitter') {
    steps.push(
      {
        path: '/onboarding/post-settings',
        key: 'post-settings',
        label: 'Targeting',
        message: 'Choose which tweets your agent should reply to',
        bar: true,
      },
      {
        path: '/onboarding/comment-settings',
        key: 'comment-settings',
        label: 'Reply Style',
        message: 'Define your reply style and tone',
        bar: true,
      }
    )
  } else {
    steps.push({
      path: '/onboarding/preview',
      key: 'preview',
      label: 'See It Work',
      message: 'See your agent at work',
      bar: true,
    })
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

/** Steps shown in the progress bar. */
export function getProgressSteps(
  platform?: OnboardingPlatform
): OnboardingStepDef[] {
  return buildOnboardingFlow(platform).filter((s) => s.bar)
}

const normalize = (pathname: string) => pathname.replace(/\/+$/, '')

/** Position in the flow, used for ordering and progress. -1 when unknown. */
export function stepIndexOf(
  key: OnboardingStepKey | undefined,
  platform?: OnboardingPlatform
): number {
  if (!key) return -1
  return buildOnboardingFlow(platform).findIndex((s) => s.key === key)
}

export function stepDefFor(
  key: OnboardingStepKey,
  platform?: OnboardingPlatform
): OnboardingStepDef | undefined {
  return buildOnboardingFlow(platform).find((s) => s.key === key)
}

/**
 * Matched against every step either flow can show, not just the current
 * platform's. The caller uses this to recognise where the user is standing,
 * and an X user who lands on the LinkedIn preview is somewhere real that needs
 * redirecting - reporting it as unknown would leave them there.
 */
export function stepKeyForPath(pathname: string): OnboardingStepKey | undefined {
  const current = normalize(pathname)
  const match = [
    ...buildOnboardingFlow('linkedin'),
    ...buildOnboardingFlow('twitter'),
  ].find((s) => normalize(s.path) === current)
  return match?.key
}

/** Prev/next paths for the current route. */
export function getStepNav(
  currentPath: string,
  platform?: OnboardingPlatform
): {
  prev?: string
  next?: string
} {
  const flow = buildOnboardingFlow(platform)
  const idx = flow.findIndex((s) => normalize(s.path) === normalize(currentPath))
  if (idx < 0) return {}
  return {
    prev: idx > 0 ? flow[idx - 1].path : undefined,
    next: idx < flow.length - 1 ? flow[idx + 1].path : undefined,
  }
}

/**
 * Translate the integer step this account was last saved with.
 *
 * Progress used to be stored as a position in a list that no longer exists, so
 * every number has to be read as "the step they had reached" and re-pointed at
 * whatever now serves that purpose. The old numbering was:
 *
 *   0 extension · 1 agent-type · 2 connect-account · 3 post-settings
 *   4 comment-settings · 5 identity · 6 activate-trial
 *
 * Anyone at 0 or 1 is sent to agent-type: it now leads, and neither of those
 * accounts has answered it.
 *
 * The two settings steps still exist for X, so an X account parked on one
 * resumes exactly where it was. On LinkedIn they are gone, and those accounts
 * go back to connect-account rather than forward: they stalled before saving
 * targeting or a comment style, and connect-account is where both are now
 * derived - waving them through to identity would finish onboarding with an
 * agent that has nothing to search for.
 */
export function stepKeyFromLegacyStep(
  step: number,
  platform: OnboardingPlatform = 'linkedin'
): OnboardingStepKey {
  if (step <= 1) return 'agent-type'
  if (step === 2) return 'connect-account'
  if (step <= 4) {
    if (platform !== 'twitter') return 'connect-account'
    return step === 3 ? 'post-settings' : 'comment-settings'
  }
  if (step === 5) return 'identity'
  return 'activate-trial'
}

/**
 * Resolve saved progress to a step, preferring the stored key and falling back
 * to the legacy integer. Accounts written before `stepKey` existed only have
 * the number, and they keep arriving until every one of them finishes or
 * lapses, so both paths stay live rather than being migrated in a batch.
 *
 * A key belonging to the other platform's flow - an X account holding
 * `preview`, a LinkedIn one holding `comment-settings` - is treated the same
 * as a deleted step, since it names a screen this user is never shown.
 */
export function resolveSavedStep(
  saved: {
    stepKey?: string
    step?: number
  },
  platform: OnboardingPlatform = 'linkedin'
): OnboardingStepKey {
  const known = buildOnboardingFlow(platform).some(
    (s) => s.key === saved.stepKey
  )
  if (known) return saved.stepKey as OnboardingStepKey
  if (saved.stepKey) return 'connect-account'
  return stepKeyFromLegacyStep(saved.step ?? 0, platform)
}
