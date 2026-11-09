import { useNavigate } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
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
 * Commentify's key; the agents run on theirs.
 *
 * The key can wait. A buyer without an OpenRouter account would otherwise be
 * held here while they open one, unable to look around the product they just
 * bought. Their first account was connected and set up on the steps before,
 * so the key is the only thing its agents are missing, and the banner on every
 * dashboard page says so until it is added. Agent runs for an owner without a
 * key stop before they search or write anything, so waiting costs nothing.
 */
export function AiKeyStep() {
  useTrackStepView('ai-key')
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { data: user } = useGetUserQuery()
  const { data: keys } = useAiKeysQuery(true)
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const openRouter = openRouterKeyOf(keys)
  const ready = Boolean(openRouter) && openRouter?.status !== 'invalid'
  const accounts = appsumoAccounts(user)

  const completeSetup = () =>
    updateOnboardingStatusAsync({
      status: 'completed',
      stepKey: 'identity',
      heardFrom: 'AppSumo',
    })

  const finish = async (): Promise<boolean> => {
    if (!ready) return false
    try {
      await completeSetup()
      posthog?.capture('onboarding_ai_key_completed', {
        status: openRouter?.status,
      })
      return true
    } catch {
      return false
    }
  }

  const addLater = async () => {
    try {
      await completeSetup()
    } catch {
      return
    }
    posthog?.capture('onboarding_ai_key_later', {
      status: openRouter?.status ?? 'missing',
    })
    navigate({ to: '/' })
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
              Save your OpenRouter key to finish. No key yet? You can add it
              later from AI keys in the sidebar, but your agents can't run until
              you do.
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
        {!ready && (
          <div className='mt-3 flex justify-end'>
            <Button
              type='button'
              variant='link'
              size='sm'
              className='text-muted-foreground h-auto px-0'
              disabled={isUpdatingOnboardingStatus}
              onClick={addLater}
            >
              Add it later
            </Button>
          </div>
        )}
      </OnboardingCard>
    </div>
  )
}
