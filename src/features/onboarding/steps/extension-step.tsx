'use client'

import { useState, useEffect, useCallback } from 'react'
import { envConfig } from '@/config/env.config'
import { Download, CheckCircle2, Info } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import extensionImage from '@/assets/images/install-extension.png'
import { useOnboarding } from '@/stores/onboarding.store'
import { checkIsExtensionInstalled } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'

export function ExtensionStep() {
  const posthog = usePostHog()
  const [isChecking, setIsChecking] = useState(true)
  const { data: user } = useGetUserQuery()
  const { data, updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatus, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const isInstalled = data.isExtensionInstalled

  const checkExtensionInstallation = useCallback(async () => {
    try {
      setIsChecking(true)
      const installed = await checkIsExtensionInstalled(
        envConfig.chromeExtensionId,
        envConfig.chromeExtensionIconUrl
      )

      if (installed) {
        posthog?.capture('onboarding_extension_installed')
        updateData({ isExtensionInstalled: true })
        markStepCompleted('extension')
        if (
          user?.metadata?.onboarding?.status === 'not-started' ||
          !user?.metadata?.onboarding
        ) {
          updateOnboardingStatus({
            status: 'in-progress',
            step: 1,
          })
        }
      }
    } catch (error) {
      console.error('Error checking extension:', error)
    } finally {
      setIsChecking(false)
    }
  }, [updateData, markStepCompleted, user])

  useEffect(() => {
    // Initial check
    checkExtensionInstallation()

    if (isInstalled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExtensionInstallation()
      }
    }

    const handlePageShow = () => {
      // Trigger when navigating back or when tab is restored from bfcache
      checkExtensionInstallation()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [checkExtensionInstallation, isInstalled, user])

  return (
    <div className='space-y-8'>
      <OnboardingCard
        title={
          <div className='flex items-center gap-2'>
            Add the Chrome extension
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label='Why the extension is needed'
                    className='border-border flex h-5 w-5 items-center justify-center rounded-full border'
                  >
                    <Info className='text-muted-foreground h-3.5 w-3.5' />
                  </button>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>
                    It securely connects LinkedIn and only posts on items you
                    approve.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        description='Install the extension to continue setup.'
      >
        <div className='flex flex-col items-center space-y-6 py-4'>
          <div
            role='status'
            aria-live='polite'
            className='bg-muted relative flex w-full max-w-md items-center justify-center overflow-hidden rounded-xl'
          >
            <img
              src={extensionImage}
              alt='Extension'
              className='h-full w-full'
            />
          </div>

          {!isInstalled ? (
            <div className='w-full max-w-xs space-y-3 text-center'>
              <Button
                className='w-full transition-all hover:shadow-md active:scale-95'
                disabled={isChecking}
                onClick={() => {
                  posthog?.capture('onboarding_extension_install_clicked')
                  window.open(
                    envConfig.extensionUrl ||
                      'https://chromewebstore.google.com',
                    '_blank',
                    'noopener,noreferrer'
                  )
                  // optional: start polling immediately
                  checkExtensionInstallation()
                }}
              >
                <Download className='mr-2 h-4 w-4' />
                Install from Chrome Web Store
              </Button>
              <button
                className='text-muted-foreground text-sm underline'
                onClick={() => {
                  posthog?.capture('onboarding_extension_check_again_clicked')
                  checkExtensionInstallation()
                }}
              >
                Already installed? Check again
              </button>
              <div className='text-muted-foreground text-xs'>
                Works on Chrome, Brave, and Edge. You can turn it off anytime.
              </div>
            </div>
          ) : (
            <div className='flex items-center gap-2 text-green-600'>
              <CheckCircle2 className='h-5 w-5' />
              <span className='font-medium'>Extension installed</span>
            </div>
          )}
        </div>

        {isInstalled && (
          <OnboardingNavigation
            nextStep='/onboarding/linkedin'
            loading={isUpdatingOnboardingStatus}
            currentStep='extension'
          />
        )}
      </OnboardingCard>
    </div>
  )
}
