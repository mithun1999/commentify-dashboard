'use client'

import { useState, useEffect, useCallback } from 'react'
import { envConfig } from '@/config/env.config'
import { Linkedin, CheckCircle2, Info, Loader2, Download } from 'lucide-react'
import { useOnboarding } from '@/stores/onboarding.store'
import {
  checkIsExtensionInstalled,
  getProfileDetailsFromExtension,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { OnboardingNavigation } from '@/features/onboarding/onboarding-navigation'
import { IProfileResponseFromExtension } from '@/features/users/interface/profile.interface'
import {
  useGetAllProfileQuery,
  useLinkProfile,
} from '@/features/users/query/profile.query'

export function LinkedInStep() {
  const { updateData, markStepCompleted } = useOnboarding()
  const { isLoading } = useGetAllProfileQuery()
  const { linkProfile, isLinkingProfile } = useLinkProfile()
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [extensionProfileData, setExtensionProfileData] =
    useState<IProfileResponseFromExtension | null>(null)
  const [isCollectingProfile, setIsCollectingProfile] = useState(false)

  const checkIfExtensionIsInstalled = async () => {
    const isInstalled = await checkIsExtensionInstalled(
      envConfig.chromeExtensionId,
      envConfig.chromeExtensionIconUrl
    )
    setIsExtensionInstalled(isInstalled)
    return isInstalled
  }

  const collectUserInformation = useCallback(async () => {
    if (isCollectingProfile) return
    setIsCollectingProfile(true)
    try {
      // Check if extension is installed first
      const isInstalled = await checkIfExtensionIsInstalled()
      if (!isInstalled) {
        setIsCollectingProfile(false)
        return
      }

      // Try to get profile details from extension
      const profileDetails = await getProfileDetailsFromExtension()

      if (
        profileDetails &&
        profileDetails.firstName &&
        profileDetails.lastName
      ) {
        setExtensionProfileData(profileDetails)
        markStepCompleted('linkedin')
        updateData({
          isLinkedInConnected: true,
          userProfile: {
            name: `${profileDetails.firstName} ${profileDetails.lastName}`,
            title: `${profileDetails.publicIdentifier}`,
          },
        })

        // Automatically link the profile
        await linkProfile(profileDetails)
      }
    } catch (error) {
      console.log('Could not auto-collect profile data:', error)
      // Silently fail - user can manually connect
    } finally {
      setIsCollectingProfile(false)
    }
  }, [isCollectingProfile, updateData, markStepCompleted, linkProfile])

  const handleLinking = async () => {
    // If no profile data found, redirect to LinkedIn
    if (!extensionProfileData) {
      window.open('https://linkedin.com/', '_blank')
      return
    }

    setIsLinking(true)
    try {
      // Link the profile (data already collected)
      await linkProfile(extensionProfileData)
    } catch (error) {
      console.error('Error linking profile:', error)
    } finally {
      setIsLinking(false)
    }
  }

  useEffect(() => {
    // Auto-collect user information when component mounts
    collectUserInformation()

    if (extensionProfileData) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        collectUserInformation()
      }
    }

    const handlePageShow = () => {
      collectUserInformation()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [collectUserInformation, extensionProfileData])

  if (isLoading) {
    return (
      <div className='space-y-8'>
        <OnboardingCard
          title='Connecting to LinkedIn'
          description='Fetching your LinkedIn profile information...'
        >
          <div className='flex flex-col items-center space-y-6 py-4'>
            <div className='text-muted-foreground flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Loading your profile...</span>
            </div>
          </div>
        </OnboardingCard>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      <OnboardingCard
        title={
          <div className='flex items-center gap-2'>
            Connect Your LinkedIn Account
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>
                    We use LinkedIn's secure API to access only
                    <br />
                    the data needed for automated commenting
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        description='We need access to your LinkedIn account to automate comments on your behalf.'
      >
        <div className='flex flex-col items-center space-y-6 py-4'>
          <div className='w-full max-w-md space-y-6'>
            {/* Show extension profile data if available */}
            {extensionProfileData && (
              <div className='flex w-full flex-col items-center space-y-4'>
                <div className='flex items-center gap-2 text-green-500 dark:text-green-400'>
                  <CheckCircle2 className='h-5 w-5' />
                  <span className='font-medium'>Profile data fetched!</span>
                </div>

                <div className='flex w-full flex-col gap-4 rounded-lg p-4'>
                  <div className='flex items-center gap-4 rounded border p-3'>
                    <div className='relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800'>
                      <span className='text-muted-foreground'>
                        {extensionProfileData.firstName?.charAt(0)}
                        {extensionProfileData.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className='font-medium'>
                        {extensionProfileData.firstName}{' '}
                        {extensionProfileData.lastName}
                      </h3>
                      <p className='text-muted-foreground text-sm font-medium'>
                        @{extensionProfileData.publicIdentifier}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!extensionProfileData && !isCollectingProfile && (
              <>
                {isExtensionInstalled ? (
                  <Button
                    className='relative w-full overflow-hidden transition-all duration-300 hover:shadow-md active:scale-95'
                    onClick={handleLinking}
                    disabled={isLinking || isLinkingProfile}
                  >
                    <Linkedin className='mr-2 h-4 w-4' />
                    {isLinking || isLinkingProfile
                      ? 'Connecting...'
                      : 'Connect LinkedIn'}
                  </Button>
                ) : (
                  <Button
                    className='w-full transition-all hover:shadow-md active:scale-95'
                    onClick={() => {
                      window.open(
                        envConfig.extensionUrl ||
                          'https://chromewebstore.google.com',
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }}
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Install from Chrome Web Store
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {extensionProfileData && (
          <OnboardingNavigation nextStep='/onboarding/post-settings' />
        )}
      </OnboardingCard>
    </div>
  )
}
