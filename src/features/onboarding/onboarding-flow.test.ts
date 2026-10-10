import { describe, expect, it } from 'vitest'
import {
  UserSubscriptionStatus,
  type IUser,
} from '@/features/auth/interface/user.interface'
import {
  buildOnboardingFlow,
  flowFor,
  onboardingRedirectTarget,
} from './onboarding-flow'

type Onboarding = IUser['metadata']['onboarding']

const user = (
  status: UserSubscriptionStatus,
  onboarding?: Partial<Onboarding>
) =>
  ({ status, metadata: { onboarding } }) as Pick<IUser, 'status' | 'metadata'>

const connectInProgress: Partial<Onboarding> = {
  status: 'in-progress',
  step: 2,
  stepKey: 'connect-account',
}

describe('onboardingRedirectTarget', () => {
  describe('pending accounts', () => {
    it('sends a brand-new account to the first step', () => {
      expect(
        onboardingRedirectTarget(user(UserSubscriptionStatus.PENDING), '/')
      ).toBe('/onboarding/agent-type')
    })

    it('sends them back to their saved step from anywhere in the app', () => {
      const u = user(UserSubscriptionStatus.PENDING, connectInProgress)
      expect(onboardingRedirectTarget(u, '/')).toBe(
        '/onboarding/connect-account'
      )
      expect(onboardingRedirectTarget(u, '/plans')).toBe(
        '/onboarding/connect-account'
      )
    })

    it('leaves them on their step or one behind it', () => {
      const u = user(UserSubscriptionStatus.PENDING, connectInProgress)
      expect(onboardingRedirectTarget(u, '/onboarding/connect-account')).toBe(
        undefined
      )
      expect(onboardingRedirectTarget(u, '/onboarding/agent-type')).toBe(
        undefined
      )
    })

    it('pulls them back when they skip ahead', () => {
      const u = user(UserSubscriptionStatus.PENDING, connectInProgress)
      expect(onboardingRedirectTarget(u, '/onboarding/activate-trial')).toBe(
        '/onboarding/connect-account'
      )
    })

    it('leaves a pending account that finished onboarding alone', () => {
      const u = user(UserSubscriptionStatus.PENDING, { status: 'completed' })
      expect(onboardingRedirectTarget(u, '/')).toBe(undefined)
    })
  })

  describe('accounts past pending', () => {
    const pastPending = [
      UserSubscriptionStatus.IN_TRIAL,
      UserSubscriptionStatus.TRIAL_EXPIRED,
      UserSubscriptionStatus.ACTIVE,
      UserSubscriptionStatus.INACTIVE,
    ]

    it.each(pastPending)(
      '%s with onboarding in progress can reach home, plans and billing',
      (status) => {
        const u = user(status, connectInProgress)
        for (const path of ['/', '/plans', '/billing']) {
          expect(onboardingRedirectTarget(u, path)).toBe(undefined)
        }
      }
    )

    it.each(pastPending)(
      '%s with no onboarding record can reach home and plans',
      (status) => {
        const u = { status, metadata: {} } as Pick<IUser, 'status' | 'metadata'>
        expect(onboardingRedirectTarget(u, '/')).toBe(undefined)
        expect(onboardingRedirectTarget(u, '/plans')).toBe(undefined)
      }
    )

    it('does not move a just-activated trial off the activate-trial step', () => {
      // Status flips before the server marks onboarding completed.
      const u = user(UserSubscriptionStatus.IN_TRIAL, {
        status: 'in-progress',
        step: 6,
        stepKey: 'activate-trial',
      })
      expect(onboardingRedirectTarget(u, '/onboarding/activate-trial')).toBe(
        undefined
      )
      // Where the step sends them afterwards must not bounce them back.
      expect(onboardingRedirectTarget(u, '/')).toBe(undefined)
    })
  })
})

describe('X onboarding flows', () => {
  const keys = (flow: Parameters<typeof buildOnboardingFlow>[0]) =>
    buildOnboardingFlow(flow).map((s) => s.key)

  it('picks the flow from what was chosen on X', () => {
    expect(flowFor(null, { platform: 'twitter', capabilities: ['comment'] })).toBe(
      'twitter'
    )
    expect(flowFor(null, { platform: 'twitter', capabilities: ['post'] })).toBe(
      'twitter-posting'
    )
    expect(
      flowFor(null, { platform: 'twitter', capabilities: ['comment', 'post'] })
    ).toBe('twitter-both')
    expect(flowFor('linkedin-posting', { platform: 'linkedin' })).toBe(
      'linkedin'
    )
  })

  it('trusts the saved slug over a missing or stale store', () => {
    expect(flowFor('twitter-posting')).toBe('twitter-posting')
    expect(flowFor('twitter-commenting')).toBe('twitter')
    expect(
      flowFor('twitter-commenting', {
        platform: 'twitter',
        capabilities: ['comment', 'post'],
      })
    ).toBe('twitter-both')
  })

  it('gives X posting the preview instead of the reply-agent forms', () => {
    expect(keys('twitter-posting')).toEqual([
      'agent-type',
      'extension',
      'connect-account',
      'preview',
      'identity',
      'activate-trial',
    ])
    expect(keys('twitter-both')).toEqual([
      'agent-type',
      'extension',
      'connect-account',
      'post-settings',
      'comment-settings',
      'preview',
      'identity',
      'activate-trial',
    ])
    expect(keys('twitter')).not.toContain('preview')
  })

  it('resumes an X posting account on the preview', () => {
    const u = user(UserSubscriptionStatus.PENDING, {
      status: 'in-progress',
      stepKey: 'preview',
      selectedAgentType: 'twitter-posting',
    })
    expect(onboardingRedirectTarget(u, '/')).toBe('/onboarding/preview')
    // Saved under the reply agent's flow, the preview is somewhere they never go.
    const reply = user(UserSubscriptionStatus.PENDING, {
      status: 'in-progress',
      stepKey: 'preview',
      selectedAgentType: 'twitter-commenting',
    })
    expect(onboardingRedirectTarget(reply, '/')).toBe(
      '/onboarding/connect-account'
    )
  })
})
