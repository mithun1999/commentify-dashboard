import { usePostHog } from 'posthog-js/react'
import { AiKeysForm } from '@/features/ai-keys/components/ai-keys-form'
import {
  openRouterKeyOf,
  useAiKeysQuery,
} from '@/features/ai-keys/query/ai-keys.query'
import {
  appsumoAccounts,
  StartWithOneNote,
} from '@/features/appsumo/components/start-with-one'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { useTrackStepView } from '../hooks/useTrackStepView'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'

/**
 * The last setup step for an AppSumo license, in place of "where did you hear
 * about us" (AppSumo) and the trial (they already paid). The preview ran on
 * Commentify's key; the agents run on theirs, so it is required to finish.
 */
export function AiKeyStep() {
  useTrackStepView('ai-key')
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { data: keys } = useAiKeysQuery(true)
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const openRouter = openRouterKeyOf(keys)
  const ready = Boolean(openRouter) && openRouter?.status !== 'invalid'
  const accounts = appsumoAccounts(user)

  const finish = async (): Promise<boolean> => {
    if (!ready) return false
    try {
      await updateOnboardingStatusAsync({
        status: 'completed',
        stepKey: 'identity',
        heardFrom: 'AppSumo',
      })
      posthog?.capture('onboarding_ai_key_completed', {
        status: openRouter?.status,
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <div className='space-y-8'>
      <OnboardingCard
        title='Keep your agents running on your own AI key'
        description='Your preview ran on our AI key. From here your agents write with yours, so you pay your AI provider directly for what they use: usually a few dollars a month per account.'
      >
        <div className='space-y-6'>
          <AiKeysForm />
          <p className='text-muted-foreground text-sm'>
            Tip: give the key a monthly limit in OpenRouter. About $5 per
            account covers typical use.
          </p>
          <StartWithOneNote accounts={accounts} done />
          {!ready && (
            <p className='text-muted-foreground text-sm'>
              Save your OpenRouter key to finish.
            </p>
          )}
        </div>
        <OnboardingNavigation
          nextStep='/'
          nextLabel='Finish'
          loading={isUpdatingOnboardingStatus}
          onNext={finish}
          currentStep='ai-key'
        />
      </OnboardingCard>
    </div>
  )
}
