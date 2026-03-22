'use client'

import { useState } from 'react'
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

export function AgentTypeStep() {
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const [selected, setSelected] = useState<AgentTypeDefinition | null>(null)
  const agentTypes = getAllAgentTypes()

  const isEligible = (type: AgentTypeDefinition) => {
    if (type.access === 'open') return true
    if (!user || !type.isEligible) return false
    return type.isEligible(user)
  }

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
              <button
                key={type.slug}
                type='button'
                disabled={!eligible}
                onClick={() => setSelected(type)}
                className={cn(
                  'flex items-start gap-4 rounded-xl border p-5 text-left transition-all',
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
                    {type.access === 'open' && (
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
            )
          })}
        </div>

        {!selected && (
          <p className='text-muted-foreground mt-6 text-center text-sm'>
            Select an agent type to continue.
          </p>
        )}

        {selected && (
          <OnboardingNavigation
            prevStep='/onboarding/extension'
            nextStep='/onboarding/connect-account'
            nextLabel='Continue'
            loading={isUpdatingOnboardingStatus}
            currentStep='agent-type'
            onNext={async () => {
              posthog?.capture('onboarding_agent_type_selected', {
                agentType: selected.slug,
              })
              updateData({ selectedAgentType: selected.slug })
              markStepCompleted('agent-type')
              const currentStep = user?.metadata?.onboarding?.step ?? 0
              if (currentStep < 2) {
                await updateOnboardingStatusAsync({
                  status: 'in-progress',
                  step: 2,
                })
              }
              return true
            }}
          />
        )}
      </OnboardingCard>
    </div>
  )
}
