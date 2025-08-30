'use client'

import { useNavigate, useLocation } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { useOnboarding } from '@/stores/onboarding.store'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const STEPS = [
  { path: '/onboarding/extension', label: 'Install Extension' },
  { path: '/onboarding/linkedin', label: 'Connect LinkedIn' },
  { path: '/onboarding/post-settings', label: 'Set Post Preferences' },
  { path: '/onboarding/comment-settings', label: 'Set Comment Style' },
  { path: '/onboarding/identity', label: 'How did you find us?' },
]

const STAGE_MESSAGES = [
  'Kick things off by installing the extension 🚀',
  'Great! Let’s link your LinkedIn profile',
  'Almost there - set how you want posts handled',
  'Now choose your comment style & tone',
  'Final step - how did you hear about us?',
]

export function OnboardingProgress() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completedSteps } = useOnboarding()

  const pathname = location.pathname
  const currentStepIndex = STEPS.findIndex((step) =>
    pathname.includes(step.path)
  )
  const progress =
    currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0

  const currentMessage =
    currentStepIndex >= 0 && currentStepIndex < STAGE_MESSAGES.length
      ? STAGE_MESSAGES[currentStepIndex]
      : 'Complete your LinkedIn automation setup'

  const handleStepClick = (stepPath: string, index: number) => {
    const stepName = stepPath.split('/').pop() || ''
    if (completedSteps.includes(stepName) || index <= currentStepIndex + 1) {
      navigate({ to: stepPath })
    }
  }

  return (
    <div className='mb-20 space-y-10'>
      <div className='flex items-center justify-center'>
        <div className='space-y-1 text-center'>
          <h2 className='text-foreground text-xl font-bold'>
            Your Setup Progress
          </h2>
          <p className='text-muted-foreground text-sm'>{currentMessage}</p>
        </div>
      </div>

      <div className='relative mt-8 px-5'>
        <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full transition-all duration-500 ease-out'
            style={{
              width: `${progress}%`,
              backgroundImage:
                'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>

        <div className='absolute top-1 right-0 left-0 flex -translate-y-1/2 justify-between'>
          {STEPS.map((step, index) => {
            const stepName = step.path.split('/').pop() || ''
            const isActive = index === currentStepIndex
            const isCompleted =
              index < currentStepIndex || completedSteps.includes(stepName)
            const isClickable = isCompleted || index < currentStepIndex + 1

            return (
              <TooltipProvider key={step.path}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative z-10 flex flex-col items-center',
                        isClickable
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-50'
                      )}
                      onClick={() => handleStepClick(step.path, index)}
                    >
                      <div
                        className={cn(
                          'bg-card flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                          isActive &&
                            'bg-primary border-primary text-primary-foreground shadow-sm',
                          isCompleted &&
                            'bg-primary border-primary text-primary-foreground shadow-sm',
                          !isActive &&
                            !isCompleted &&
                            'bg-muted border-border text-muted-foreground'
                        )}
                      >
                        {isCompleted ? (
                          <CheckIcon className='h-5 w-5' />
                        ) : (
                          <span className='text-sm font-medium'>
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <span
                        className={cn(
                          'absolute top-12 hidden text-center text-xs font-medium whitespace-nowrap md:block',
                          isActive && 'text-primary',
                          isCompleted && 'text-primary',
                          !isActive && !isCompleted && 'text-muted-foreground'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{`${step.label}`}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>
    </div>
  )
}
