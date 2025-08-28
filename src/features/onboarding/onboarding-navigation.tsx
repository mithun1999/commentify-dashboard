'use client'

import { useNavigate } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingNavigationProps {
  prevStep?: string
  nextStep?: string
  nextLabel?: string
  onNext?: () => Promise<boolean> | boolean
  loading?: boolean
}

export function OnboardingNavigation({
  prevStep,
  nextStep,
  nextLabel = 'Continue',
  onNext,
  loading = false,
}: OnboardingNavigationProps) {
  const navigate = useNavigate()
  const posthog = usePostHog()

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext()
      if (!canProceed) return
    }

    if (nextStep) {
      posthog?.capture('onboarding_next_clicked', { nextStep })
      navigate({ to: nextStep })
    }
  }

  return (
    <div className='mt-8 flex justify-between'>
      {prevStep ? (
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            posthog?.capture('onboarding_back_clicked', { prevStep })
            navigate({ to: prevStep })
          }}
          disabled={loading}
          className='group bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground relative overflow-hidden transition-all duration-300 hover:shadow-md active:scale-95'
        >
          <ArrowLeft className='mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5' />
          Back
        </Button>
      ) : (
        <div></div>
      )}

      {nextStep && (
        <Button
          type='button'
          onClick={handleNext}
          disabled={loading}
          className='group bg-primary text-primary-foreground hover:bg-primary/90 relative overflow-hidden transition-all duration-300 hover:shadow-md active:scale-95'
        >
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Loading...
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
