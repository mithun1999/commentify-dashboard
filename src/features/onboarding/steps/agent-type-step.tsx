'use client'

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { useOnboarding } from '@/stores/onboarding.store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useTrackStepView } from '../hooks/useTrackStepView'

export function AgentTypeStep() {
  useTrackStepView('agent-type')

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
  const [websiteUrl, setWebsiteUrl] = useState(
    onboardingData.salesSetting.websiteUrl
  )

  // Mirror the in-progress pick into the store so the progress bar reflects the
  // chosen capabilities live (post-only drops the commenting steps immediately).
  const handleSelectionChange = (next: PlatformCapabilitySelection) => {
    setSelection(next)
    updateData({
      selectedPlatform: next.platform,
      selectedCapabilities: next.capabilities,
    })
  }

  const canProceed =
    Boolean(selection.platform) && selection.capabilities.length > 0

  // Mirrors the picker, which only offers the goal on LinkedIn. Without the
  // platform check a leftover 'sales' pick survives a switch to X.
  const isSales =
    selection.platform === 'linkedin' &&
    selection.capabilities.includes('comment') &&
    selection.commentGoal === 'sales'

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

        {isSales && (
          <div className='mt-8 space-y-2'>
            <Label htmlFor='sales-website-url'>What are you selling?</Label>
            <Input
              id='sales-website-url'
              type='url'
              inputMode='url'
              placeholder='yourcompany.com'
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <p className='text-muted-foreground text-xs'>
              We read your site to work out who to look for and what to say. You
              can skip this and we will go off your LinkedIn profile instead.
            </p>
          </div>
        )}

        {!canProceed && (
          <p className='text-muted-foreground mt-6 text-center text-sm'>
            {selection.platform
              ? 'Select at least one capability to continue.'
              : 'Select a platform to continue.'}
          </p>
        )}

        <OnboardingNavigation
          nextStep={canProceed ? '/onboarding/extension' : undefined}
          nextLabel='Continue'
          loading={isUpdatingOnboardingStatus}
          currentStep='agent-type'
          onNext={
            canProceed && primarySlug
              ? async () => {
                  const agentMode = isSales ? 'sales' : 'branding'
                  posthog?.capture('onboarding_agent_type_selected', {
                    platform: selection.platform,
                    capabilities: selection.capabilities,
                    primaryAgentType: primarySlug,
                    agentMode,
                    hasWebsite: isSales && Boolean(websiteUrl.trim()),
                  })
                  updateData({
                    selectedPlatform: selection.platform,
                    selectedCapabilities: selection.capabilities,
                    selectedAgentType: primarySlug,
                    selectedAgentMode: agentMode,
                    salesSetting: {
                      ...onboardingData.salesSetting,
                      websiteUrl: isSales ? normalizeUrl(websiteUrl) : '',
                    },
                  })
                  markStepCompleted('agent-type')
                  await updateOnboardingStatusAsync({
                    status: 'in-progress',
                    stepKey: 'extension',
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

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
