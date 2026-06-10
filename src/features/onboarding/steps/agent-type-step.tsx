'use client'

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useOnboarding } from '@/stores/onboarding.store'
import { getAgentTypeFor } from '@/features/agent-system/registry'
import {
  PlatformCapabilityPicker,
  type PlatformCapabilitySelection,
} from '@/features/agent-system/components/platform-capability-picker'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useExtensionGuard } from '../hooks/useExtensionGuard'
import { useTrackStepView } from '../hooks/useTrackStepView'

export function AgentTypeStep() {
  useTrackStepView('agent-type')
  const { isChecking } = useExtensionGuard()

  const posthog = usePostHog()
  const navigate = useNavigate()
  const { data: user } = useGetUserQuery()
  const { data: onboardingData, updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const [selection, setSelection] = useState<PlatformCapabilitySelection>({
    platform: onboardingData.selectedPlatform ?? null,
    capabilities: onboardingData.selectedCapabilities ?? [],
    commentGoal: onboardingData.selectedAgentMode === 'sales' ? 'sales' : 'branding',
  })

  // Mirror the in-progress pick into the store so the progress bar reflects the
  // chosen capabilities live (post-only drops the commenting steps immediately).
  const handleSelectionChange = (next: PlatformCapabilitySelection) => {
    setSelection(next)
    updateData({
      selectedPlatform: next.platform,
      selectedCapabilities: next.capabilities,
    })
  }

  if (isChecking) {
    return (
      <div className='space-y-8'>
        <OnboardingCard
          title='Choose your agent'
          description='Verifying extension installation...'
        >
          <div className='flex flex-col items-center space-y-6 py-4'>
            <div className='text-muted-foreground flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Checking extension...</span>
            </div>
          </div>
        </OnboardingCard>
      </div>
    )
  }

  const canProceed =
    Boolean(selection.platform) && selection.capabilities.length > 0

  const primaryCapability = selection.capabilities.includes('comment')
    ? 'comment'
    : 'post'
  const primarySlug = selection.platform
    ? getAgentTypeFor(selection.platform, primaryCapability)?.slug ?? null
    : null

  return (
    <div className='space-y-8'>
      <OnboardingCard
        title='Choose your agent'
        description='Pick a platform and what you want it to do. You can run both commenting and posting on the same account.'
      >
        <PlatformCapabilityPicker
          value={selection}
          onChange={handleSelectionChange}
          user={user}
          showCommentGoal
          onUpgrade={() => navigate({ to: '/billing' })}
        />

        {!canProceed && (
          <p className='text-muted-foreground mt-6 text-center text-sm'>
            {selection.platform
              ? 'Select at least one capability to continue.'
              : 'Select a platform to continue.'}
          </p>
        )}

        <OnboardingNavigation
          prevStep='/onboarding/extension'
          nextStep={canProceed ? '/onboarding/connect-account' : undefined}
          nextLabel='Continue'
          loading={isUpdatingOnboardingStatus}
          currentStep='agent-type'
          onNext={
            canProceed && primarySlug
              ? async () => {
                  posthog?.capture('onboarding_agent_type_selected', {
                    platform: selection.platform,
                    capabilities: selection.capabilities,
                    primaryAgentType: primarySlug,
                    agentMode: selection.capabilities.includes('comment')
                      ? selection.commentGoal
                      : 'branding',
                  })
                  updateData({
                    selectedPlatform: selection.platform,
                    selectedCapabilities: selection.capabilities,
                    selectedAgentType: primarySlug,
                    selectedAgentMode: selection.capabilities.includes('comment')
                      ? selection.commentGoal
                      : 'branding',
                  })
                  markStepCompleted('agent-type')
                  const currentStep = user?.metadata?.onboarding?.step ?? 0
                  await updateOnboardingStatusAsync({
                    status: 'in-progress',
                    step: currentStep < 2 ? 2 : currentStep,
                    selectedAgentType: primarySlug,
                  })
                  return true
                }
              : undefined
          }
        />
      </OnboardingCard>
    </div>
  )
}
