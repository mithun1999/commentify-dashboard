'use client'

import { useState } from 'react'
import { Loader2, Megaphone, Target } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/stores/onboarding.store'
import { getAllAgentTypes } from '@/features/agent-system/registry'
import type { AgentTypeDefinition } from '@/features/agent-system/types/agent.types'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useExtensionGuard } from '../hooks/useExtensionGuard'
import { useTrackStepView } from '../hooks/useTrackStepView'

type AgentMode = 'branding' | 'sales'

const LINKEDIN_MODES: {
  value: AgentMode
  label: string
  description: string
  icon: typeof Megaphone
}[] = [
  {
    value: 'branding',
    label: 'Personal Branding',
    description: 'Grow your network by commenting on relevant posts',
    icon: Megaphone,
  },
  {
    value: 'sales',
    label: 'Sales',
    description:
      'Find high-intent posts and pitch your product naturally',
    icon: Target,
  },
]

export function AgentTypeStep() {
  useTrackStepView('agent-type')
  const { isChecking } = useExtensionGuard()

  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const [selected, setSelected] = useState<AgentTypeDefinition | null>(null)
  const [selectedMode, setSelectedMode] = useState<AgentMode | null>(null)
  const agentTypes = getAllAgentTypes()

  if (isChecking) {
    return (
      <div className='space-y-8'>
        <OnboardingCard
          title='Choose your agent type'
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

  const isEligible = (type: AgentTypeDefinition) => {
    if (type.access === 'open') return true
    if (!user || !type.isEligible) return false
    return type.isEligible(user)
  }

  const showModeSelector = selected?.platform === 'linkedin'
  const canProceed = selected && (!showModeSelector || selectedMode)

  return (
    <div className='space-y-8'>
      <OnboardingCard
        title='Choose your agent type'
        description='Pick the platform where you want to start engaging automatically.'
      >
        <div className='grid gap-3'>
          {agentTypes.map((type) => {
            const eligible = isEligible(type)
            const Icon = type.icon
            const isSelected = selected?.slug === type.slug

            return (
              <div key={type.slug}>
                <button
                  type='button'
                  disabled={!eligible}
                  onClick={() => {
                    setSelected(type)
                    if (type.platform !== 'linkedin') {
                      setSelectedMode(null)
                    }
                  }}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-xl border p-5 text-left transition-all',
                    isSelected &&
                      'ring-primary border-primary bg-primary/5 ring-2',
                    eligible
                      ? 'hover:bg-muted/50 cursor-pointer'
                      : 'cursor-not-allowed opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isSelected ? 'bg-primary/10' : 'bg-muted'
                    )}
                  >
                    <Icon className='size-6' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold'>{type.name}</span>
                      {type.badge && (
                        <Badge variant='secondary' className='text-xs'>
                          {type.badge}
                        </Badge>
                      )}
                      {type.recommended && (
                        <Badge
                          variant='outline'
                          className='border-green-500/30 text-xs text-green-600'
                        >
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {type.description}
                    </p>
                    {!eligible && (
                      <p className='mt-2 text-xs text-amber-600'>
                        Available by invitation for paid customers.
                      </p>
                    )}
                  </div>
                </button>

                {isSelected && type.platform === 'linkedin' && (
                  <div className='mt-3 ml-16 grid gap-2'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                      What's your goal?
                    </p>
                    {LINKEDIN_MODES.map((mode) => {
                      const ModeIcon = mode.icon
                      const isModeSelected = selectedMode === mode.value
                      return (
                        <button
                          key={mode.value}
                          type='button'
                          onClick={() => setSelectedMode(mode.value)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                            isModeSelected
                              ? 'ring-primary border-primary bg-primary/5 ring-1'
                              : 'hover:bg-muted/50 border-border'
                          )}
                        >
                          <ModeIcon
                            className={cn(
                              'size-4 shrink-0',
                              isModeSelected
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div>
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isModeSelected && 'text-primary'
                              )}
                            >
                              {mode.label}
                            </span>
                            <p className='text-muted-foreground text-xs'>
                              {mode.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!canProceed && (
          <p className='text-muted-foreground mt-6 text-center text-sm'>
            {selected && showModeSelector
              ? 'Select a mode to continue.'
              : 'Select an agent type to continue.'}
          </p>
        )}

        <OnboardingNavigation
          prevStep='/onboarding/extension'
          nextStep={canProceed ? '/onboarding/connect-account' : undefined}
          nextLabel='Continue'
          loading={isUpdatingOnboardingStatus}
          currentStep='agent-type'
          onNext={
            canProceed
              ? async () => {
                  posthog?.capture('onboarding_agent_type_selected', {
                    agentType: selected!.slug,
                    agentMode: selectedMode ?? 'branding',
                  })
                  updateData({
                    selectedAgentType: selected!.slug,
                    selectedAgentMode:
                      selected!.platform === 'linkedin'
                        ? (selectedMode ?? 'branding')
                        : 'branding',
                  })
                  markStepCompleted('agent-type')
                  const currentStep =
                    user?.metadata?.onboarding?.step ?? 0
                  if (currentStep < 2) {
                    await updateOnboardingStatusAsync({
                      status: 'in-progress',
                      step: 2,
                      selectedAgentType: selected!.slug,
                    })
                  } else {
                    await updateOnboardingStatusAsync({
                      status: 'in-progress',
                      step: currentStep,
                      selectedAgentType: selected!.slug,
                    })
                  }
                  return true
                }
              : undefined
          }
        />
      </OnboardingCard>
    </div>
  )
}
