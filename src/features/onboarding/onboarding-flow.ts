import type { OnboardingPlatform } from '@/stores/onboarding.store'
import {
  UserSubscriptionStatus,
  type IUser,
} from '@/features/auth/interface/user.interface'

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
 * Which sequence an account follows. LinkedIn has one, because its preview
 * shows commenting and posting together. X splits by what was picked, since
 * its two agents onboard differently: the reply agent is told what to target
 * and how to sound, and the posting agent writes a draft on the preview the
 * way LinkedIn's does.
 *
 * `twitter` is the reply agent alone, which is what every X account in
 * onboarding was before X posting existed.
 */
export type OnboardingFlowKind =
  | 'linkedin'
  | 'twitter'
  | 'twitter-posting'
  | 'twitter-both'

const ALL_FLOWS: OnboardingFlowKind[] = [
  'linkedin',
  'twitter',
  'twitter-posting',
  'twitter-both',
]

/**
 * The flow for an account. The saved slug is the primary agent, and
 * commenting wins when both were picked, so a saved posting slug means posting
 * alone. Whether a commenting pick also wanted posting lives only in the
 * wizard's store; without it the account gets the reply-agent flow, which is
 * still a complete one.
 */
export function flowFor(
  savedAgentType?: string | null,
  picked?: {
    platform?: OnboardingPlatform | null
    capabilities?: string[] | null
  } | null
): OnboardingFlowKind {
  const platform = platformFor(savedAgentType, picked?.platform)
  if (platform !== 'twitter') return 'linkedin'

  const pickedX = picked?.platform === 'twitter' ? picked.capabilities ?? [] : []
  const comment = savedAgentType
    ? !savedAgentType.includes('posting')
    : pickedX.includes('comment') || !pickedX.includes('post')
  const post = savedAgentType?.includes('posting') || pickedX.includes('post')

  if (comment && post) return 'twitter-both'
  return post ? 'twitter-posting' : 'twitter'
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
 * X's reply agent keeps those forms. The comment preview reads LinkedIn
 * specifically, from the customer's own LinkedIn session, and there is no X
 * equivalent of it; until that exists, an X user says what to target rather
 * than being shown it. X's posting agent does get the preview: writing a post
 * in their voice reads their own X account, which they have just connected.
 */
export function buildOnboardingFlow(
  flow: OnboardingFlowKind = 'linkedin'
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

  const xComment = flow === 'twitter' || flow === 'twitter-both'
  const preview = flow !== 'twitter'

  if (xComment) {
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
  }
  if (preview) {
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
  flow?: OnboardingFlowKind
): OnboardingStepDef[] {
  return buildOnboardingFlow(flow).filter((s) => s.bar)
}

const normalize = (pathname: string) => pathname.replace(/\/+$/, '')

/** Position in the flow, used for ordering and progress. -1 when unknown. */
export function stepIndexOf(
  key: OnboardingStepKey | undefined,
  flow?: OnboardingFlowKind
): number {
  if (!key) return -1
  return buildOnboardingFlow(flow).findIndex((s) => s.key === key)
}

export function stepDefFor(
  key: OnboardingStepKey,
  flow?: OnboardingFlowKind
): OnboardingStepDef | undefined {
  return buildOnboardingFlow(flow).find((s) => s.key === key)
}

/**
 * Matched against every step any flow can show, not just the current one's.
 * The caller uses this to recognise where the user is standing, and an X
 * reply-agent user who lands on the preview is somewhere real that needs
 * redirecting - reporting it as unknown would leave them there.
 */
export function stepKeyForPath(pathname: string): OnboardingStepKey | undefined {
  const current = normalize(pathname)
  const match = ALL_FLOWS.flatMap((flow) => buildOnboardingFlow(flow)).find(
    (s) => normalize(s.path) === current
  )
  return match?.key
}

/** Prev/next paths for the current route. */
export function getStepNav(
  currentPath: string,
  flow?: OnboardingFlowKind
): {
  prev?: string
  next?: string
} {
  const steps = buildOnboardingFlow(flow)
  const idx = steps.findIndex(
    (s) => normalize(s.path) === normalize(currentPath)
  )
  if (idx < 0) return {}
  return {
    prev: idx > 0 ? steps[idx - 1].path : undefined,
    next: idx < steps.length - 1 ? steps[idx + 1].path : undefined,
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
 * The two settings steps still exist for X's reply agent, so an X account
 * parked on one resumes exactly where it was. On LinkedIn they are gone, and
 * those accounts go back to connect-account rather than forward: they stalled
 * before saving targeting or a comment style, and connect-account is where
 * both are now derived - waving them through to identity would finish
 * onboarding with an agent that has nothing to search for.
 */
export function stepKeyFromLegacyStep(
  step: number,
  flow: OnboardingFlowKind = 'linkedin'
): OnboardingStepKey {
  if (step <= 1) return 'agent-type'
  if (step === 2) return 'connect-account'
  if (step <= 4) {
    if (!stepDefFor('post-settings', flow)) return 'connect-account'
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
 * A key belonging to another flow - an X reply-agent account holding
 * `preview`, a LinkedIn one holding `comment-settings` - is treated the same
 * as a deleted step, since it names a screen this user is never shown.
 */
export function resolveSavedStep(
  saved: {
    stepKey?: string
    step?: number
  },
  flow: OnboardingFlowKind = 'linkedin'
): OnboardingStepKey {
  const known = buildOnboardingFlow(flow).some((s) => s.key === saved.stepKey)
  if (known) return saved.stepKey as OnboardingStepKey
  if (saved.stepKey) return 'connect-account'
  return stepKeyFromLegacyStep(saved.step ?? 0, flow)
}

/**
 * Where the onboarding guard should send this account from `pathname`, or
 * undefined to leave it where it is.
 */
export function onboardingRedirectTarget(
  user: Pick<IUser, 'status' | 'metadata'>,
  pathname: string,
  picked?: Parameters<typeof flowFor>[1]
): string | undefined {
  const onboarding = user.metadata?.onboarding
  if (onboarding?.status === 'completed') return
  // The wizard ends in starting a trial; anyone past pending has nothing to
  // activate there.
  if (user.status !== UserSubscriptionStatus.PENDING) return

  const flow = flowFor(onboarding?.selectedAgentType, picked)
  const savedKey = resolveSavedStep(
    {
      stepKey: onboarding?.stepKey,
      step: onboarding?.step,
    },
    flow
  )
  const currentKey = stepKeyForPath(pathname)

  // On a step we recognise, only intervene when they are ahead of their saved
  // progress. Pulling someone backwards would undo a step they just finished
  // but whose save has not landed yet.
  //
  // A step belonging to another flow indexes as -1, which is never ahead -
  // the route itself sends those on, and racing it from here would fight
  // that redirect.
  if (currentKey) {
    if (stepIndexOf(currentKey, flow) <= stepIndexOf(savedKey, flow)) return
  }

  return stepDefFor(savedKey, flow)?.path ?? '/onboarding/agent-type'
}
