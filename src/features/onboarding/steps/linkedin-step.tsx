'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Info, Loader2 } from 'lucide-react'
import { IconBrandLinkedin, IconBrandX } from '@tabler/icons-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { detectExtension } from '@/lib/extension'
import { getProfileDetailsFromExtension } from '@/lib/utils'
import { getAgentType, getAgentTypeFor } from '@/features/agent-system/registry'
import { updateAgentTypes } from '@/features/post-generator/api/post-generator.api'
import {
  getTwitterProfileDetailsFromExtension,
  type ITwitterProfileFromExtension,
} from '@/features/twitter-commenting/utils/extension'
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
import { OnboardingNavigation } from '@/features/onboarding/onboarding-navigation'
import {
  getStepNav,
  resolveSavedStep,
  stepIndexOf,
  stepKeyForPath,
} from '@/features/onboarding/onboarding-flow'
import { prewarmPostingPreview } from '@/features/onboarding/api/preview.api'
import { useDeriveOnboardingSettings } from '@/features/onboarding/hooks/useDeriveOnboardingSettings'
import { useExtensionGuard } from '@/features/onboarding/hooks/useExtensionGuard'
import { useTrackStepView } from '@/features/onboarding/hooks/useTrackStepView'
import { IProfileResponseFromExtension } from '@/features/users/interface/profile.interface'
import {
  ProfileQueryEnum,
  useGetAllProfileQuery,
  useLinkProfile,
  useLinkTwitterProfile,
} from '@/features/users/query/profile.query'

type ProfileData =
  | (IProfileResponseFromExtension & { _platform: 'linkedin' })
  | (ITwitterProfileFromExtension & { _platform: 'twitter' })

const PLATFORM_CONFIG = {
  linkedin: {
    title: 'Connect Your LinkedIn Account',
    description:
      'We need access to your LinkedIn account to automate comments on your behalf.',
    tooltip:
      'We use LinkedIn\u2019s secure API to access only the data needed for automated commenting.',
    buttonLabel: 'Connect LinkedIn',
    connectingLabel: 'Connecting...',
    icon: IconBrandLinkedin,
    loginUrl: 'https://www.linkedin.com',
    loginPrompt: 'Please log in to LinkedIn first to continue',
  },
  twitter: {
    title: 'Connect Your X Account',
    description:
      'We need access to your X account to automate replies on your behalf.',
    tooltip:
      'We securely access only the data needed to post replies on tweets you approve.',
    buttonLabel: 'Connect X',
    connectingLabel: 'Connecting...',
    icon: IconBrandX,
    loginUrl: 'https://x.com',
    loginPrompt: 'Please log in to X first to continue',
  },
} as const

export function LinkedInStep() {
  useTrackStepView('connect-account')
  const { isChecking: isExtensionGuardChecking } = useExtensionGuard()
  const posthog = usePostHog()
  const queryClient = useQueryClient()
  const { data: onboardingData, updateData, markStepCompleted } =
    useOnboarding()
  const { data: user } = useGetUserQuery()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles, isLoading } = useGetAllProfileQuery()
  const { linkProfile, isLinkingProfile } = useLinkProfile(true)
  const { linkTwitterProfile, isLinkingTwitterProfile } = useLinkTwitterProfile(true)
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const hasLinkedRef = useRef(false)
  const hasCollectedRef = useRef(false)

  const { start: startDerivation, saveInBackground: saveDerivedSettings } =
    useDeriveOnboardingSettings()

  const selectedSlug = onboardingData.selectedAgentType
    ?? user?.metadata?.onboarding?.selectedAgentType
    ?? null
  const agentDef = selectedSlug ? getAgentType(selectedSlug) : null
  const platform = agentDef?.platform ?? 'linkedin'
  const config = PLATFORM_CONFIG[platform]
  const PlatformIcon = config.icon

  const capabilities = onboardingData.selectedCapabilities ?? []
  const wantsPost = capabilities.includes('post')
  const wantsComment = capabilities.includes('comment')
  // Platform-aware: the two flows diverge here, and asking for the LinkedIn
  // one lands an X account on the preview - a step its flow does not contain,
  // so the save is rejected as out-of-order and the user is bounced back here.
  const connectNextStep =
    getStepNav('/onboarding/connect-account', platform).next ??
    '/onboarding/identity'
  const connectNextKey = stepKeyForPath(connectNextStep) ?? 'identity'

  const checkIfExtensionIsInstalled = async () => {
    const { installed } = await detectExtension()
    setIsExtensionInstalled(installed)
    return installed
  }

  const userOnboarding = user?.metadata?.onboarding
  const isConnectStepCompleted =
    userOnboarding &&
    (userOnboarding.status === 'completed' ||
      stepIndexOf(
        resolveSavedStep({
          stepKey: userOnboarding.stepKey,
          step: userOnboarding.step,
        })
      ) > stepIndexOf('connect-account'))

  const collectLinkedInInfo = useCallback(async () => {
    try {
      const details = await getProfileDetailsFromExtension()
      const hasName = Boolean(details?.firstName && details?.lastName)
      if (!details || !hasName || !details.publicIdentifier) return null
      return details
    } catch {
      return null
    }
  }, [])

  const collectTwitterInfo = useCallback(async () => {
    try {
      const details = await getTwitterProfileDetailsFromExtension()
      if (!details?.authToken) return null
      return details
    } catch {
      return null
    }
  }, [])

  const collectUserInformation = useCallback(async ({ silent = false } = {}) => {
    if (hasCollectedRef.current || isConnectStepCompleted) return

    try {
      const isInstalled = await checkIfExtensionIsInstalled()
      if (!isInstalled) return

      if (platform === 'twitter') {
        const details = await collectTwitterInfo()
        if (!details) {
          if (!silent) {
            toast.error('Please log in to X.com first, then come back here.', { id: 'twitter-login-needed' })
          }
          return
        }

        if (hasLinkedRef.current) return
        hasLinkedRef.current = true

        try {
          await linkTwitterProfile(details)

          hasCollectedRef.current = true
          setProfileData({ ...details, _platform: 'twitter' })
          markStepCompleted('connect-account')
          updateData({
            isLinkedInConnected: true,
            userProfile: {
              name: details.displayName || `${details.firstName} ${details.lastName}` || 'X User',
              title: details.screenName ? `@${details.screenName}` : '',
            },
          })

          posthog?.capture('onboarding_twitter_profile_fetched', {
            screenName: details.screenName,
          })
        } catch {
          hasLinkedRef.current = false
        }
      } else {
        const details = await collectLinkedInInfo()
        if (!details) {
          if (!silent) {
            toast.error('Please log in to LinkedIn first, then come back here.', { id: 'linkedin-login-needed' })
          }
          return
        }

        if (hasLinkedRef.current) return
        hasLinkedRef.current = true

        try {
          await linkProfile(details)

          hasCollectedRef.current = true
          setProfileData({ ...details, _platform: 'linkedin' })
          markStepCompleted('connect-account')
          updateData({
            isLinkedInConnected: true,
            userProfile: {
              name: `${details.firstName} ${details.lastName}`,
              title: `${details.publicIdentifier}`,
            },
          })

          posthog?.capture('onboarding_linkedin_profile_fetched', {
            publicIdentifier: details.publicIdentifier,
          })
        } catch {
          hasLinkedRef.current = false
        }
      }
    } catch (error) {
      if (silent) return
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('Chrome extension runtime is not available')) {
        toast.error(
          "We're having trouble with your browser. Please use Chrome with the Commentify extension installed and enabled.",
          { id: 'runtime-missing' }
        )
      } else {
        toast.error(
          `Could not collect your ${platform === 'twitter' ? 'X' : 'LinkedIn'} profile data. Please try again.`,
          { id: 'collect-failed' }
        )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnectStepCompleted, platform, collectLinkedInInfo, collectTwitterInfo])

  const handleLinking = async () => {
    setIsLinking(true)
    try {
      posthog?.capture(`onboarding_${platform}_connect_clicked`, {
        hasProfileData: Boolean(profileData),
      })

      if (hasLinkedRef.current) return
      hasLinkedRef.current = true

      if (profileData) {
        if (profileData._platform === 'linkedin') {
          await linkProfile(profileData)
        } else {
          await linkTwitterProfile(profileData)
        }
      } else if (platform === 'linkedin') {
        await linkProfile()
      } else {
        const details = await getTwitterProfileDetailsFromExtension()
        if (!details?.authToken) {
          toast.error(config.loginPrompt)
          window.open(config.loginUrl, '_blank')
          hasLinkedRef.current = false
          return
        }
        await linkTwitterProfile(details)
        setProfileData({ ...details, _platform: 'twitter' })
        markStepCompleted('connect-account')
        updateData({
          isLinkedInConnected: true,
          userProfile: {
            name: details.displayName || `${details.firstName} ${details.lastName}` || 'X User',
            title: details.screenName ? `@${details.screenName}` : '',
          },
        })
      }

      posthog?.capture(`onboarding_${platform}_link_success`)
    } catch (error) {
      console.error('Error linking profile:', error)
      hasLinkedRef.current = false
    } finally {
      setIsLinking(false)
    }
  }

  useEffect(() => {
    if (profileData || isConnectStepCompleted) return

    collectUserInformation({ silent: true })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !hasCollectedRef.current) {
        collectUserInformation()
      }
    }

    const handlePageShow = () => {
      if (!hasCollectedRef.current) {
        collectUserInformation()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [collectUserInformation, profileData, isConnectStepCompleted])

  useEffect(() => {
    checkIfExtensionIsInstalled()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasProfileInfo = profileData || (isConnectStepCompleted && onboardingData.userProfile)

  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id

  // Targeting and comment style are worked out from the profile instead of
  // being asked for. Kicking it off on link rather than on Continue means it
  // runs while the user reads the confirmation.
  //
  // LinkedIn only: it derives both from a LinkedIn profile read, which an X
  // account has nothing to answer. X asks for them on the two steps that
  // follow, and deriving here would overwrite those answers before they are
  // given.
  const derives = wantsComment && platform === 'linkedin'

  useEffect(() => {
    if (!derives || !hasProfileInfo || !resolvedProfileId) return
    startDerivation(resolvedProfileId)
  }, [derives, hasProfileInfo, resolvedProfileId, startDerivation])

  const displayName =
    profileData?._platform === 'twitter'
      ? profileData.displayName ||
        `${profileData.firstName} ${profileData.lastName}`
      : profileData
        ? `${profileData.firstName} ${profileData.lastName}`
        : onboardingData.userProfile?.name ?? ''

  const displayHandle =
    profileData?._platform === 'twitter'
      ? (profileData.screenName ? `@${profileData.screenName}` : '')
      : profileData?._platform === 'linkedin'
        ? `@${profileData.publicIdentifier}`
        : onboardingData.userProfile?.title ?? ''

  const displayInitials =
    profileData?._platform === 'twitter'
      ? (profileData.displayName?.charAt(0) ??
        profileData.firstName?.charAt(0) ??
        '')
      : profileData
        ? `${profileData.firstName?.charAt(0) ?? ''}${profileData.lastName?.charAt(0) ?? ''}`
        : onboardingData.userProfile?.name?.charAt(0) ?? ''

  if (isLoading || isExtensionGuardChecking) {
    return (
      <div className='space-y-8'>
        <OnboardingCard
          title={`Connecting to ${platform === 'twitter' ? 'X' : 'LinkedIn'}`}
          description={`Fetching your ${platform === 'twitter' ? 'X' : 'LinkedIn'} profile information...`}
        >
          <div className='flex flex-col items-center space-y-6 py-4'>
            <div className='text-muted-foreground flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>{isExtensionGuardChecking ? 'Checking extension...' : 'Loading your profile...'}</span>
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
            {config.title}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>{config.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        description={config.description}
      >
        <div className='flex flex-col items-center space-y-6 py-4'>
          <div className='w-full max-w-md space-y-6'>
            {hasProfileInfo && (
              <div className='flex w-full flex-col items-center space-y-4'>
                <div className='flex items-center gap-2 text-green-500 dark:text-green-400'>
                  <CheckCircle2 className='h-5 w-5' />
                  <span className='font-medium'>
                    {isConnectStepCompleted && !profileData
                      ? 'Account connected'
                      : 'Profile data fetched!'}
                  </span>
                </div>

                {/*
                  Working out the keywords used to be shown here, with its own
                  spinner and chips. It is real work and worth seeing, but not
                  on a screen whose only job is done - it held the user on a
                  confirmation reading a list they had no reason to check yet.
                  The next screen narrates it alongside the search it feeds.
                */}
                <div className='flex w-full flex-col gap-4 rounded-lg p-4'>
                  <div className='flex items-center gap-4 rounded border p-3'>
                    <div className='relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800'>
                      <span className='text-muted-foreground'>
                        {displayInitials}
                      </span>
                    </div>
                    <div>
                      <h3 className='font-medium'>{displayName}</h3>
                      <p className='text-muted-foreground text-sm font-medium'>
                        {displayHandle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hasProfileInfo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className='w-full'>
                      <Button
                        className='relative w-full overflow-hidden transition-all duration-300 hover:shadow-md active:scale-95'
                        onClick={handleLinking}
                        disabled={!isExtensionInstalled || isLinking || isLinkingProfile || isLinkingTwitterProfile}
                      >
                        {isLinking || isLinkingProfile || isLinkingTwitterProfile ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            {config.connectingLabel}
                          </>
                        ) : (
                          <>
                            <PlatformIcon className='mr-2 h-4 w-4' />
                            {config.buttonLabel}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isExtensionInstalled && (
                    <TooltipContent>
                      <p>Please install the Commentify extension first</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {hasProfileInfo && (
          <OnboardingNavigation
            prevStep='/onboarding/extension'
            nextStep={connectNextStep}
            currentStep='connect-account'
            loading={isUpdatingOnboardingStatus}
            onNext={async () => {
              const resolvedId =
                activeProfile?._id ?? profiles?.[profiles.length - 1]?._id
              if (resolvedId) {
                updateData({ linkedProfileId: resolvedId })

                // Not awaited. Reading the profile and validating keywords
                // against real searches is up to a minute of work, and holding
                // Continue for it buys a silent spinner on the one screen with
                // nothing to show. The preview step waits on this instead, and
                // has somewhere to say so.
                if (derives) {
                  saveDerivedSettings(resolvedId)
                }

                // Activate the posting agent up front so it shows in the hub and
                // runs its own voice-analysis onboarding when opened.
                if (wantsPost && platform === 'linkedin') {
                  const postingSlug = getAgentTypeFor('linkedin', 'post')?.slug
                  if (postingSlug) {
                    // Called directly rather than through useActivateAgentType:
                    // this runs before checkout, so the posting slot cap is 0 and
                    // the backend refuses with a 400 by design, granting the slot
                    // later when the entitlement arrives. A mutation would hand
                    // that expected refusal to the global onError toast, which a
                    // local catch cannot suppress.
                    try {
                      await updateAgentTypes(resolvedId, { add: postingSlug })
                      queryClient.invalidateQueries({
                        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
                      })
                    } catch {
                      // Non-fatal: user can add it from the hub later.
                    }
                  }

                  // The voice build plus a first draft takes about a minute, so
                  // it starts here and finishes while the comment preview runs.
                  void prewarmPostingPreview({ profileId: resolvedId }).catch(
                    () => {}
                  )
                }
              }
              await updateOnboardingStatusAsync({
                status: 'in-progress',
                stepKey: connectNextKey,
              })
              return true
            }}
          />
        )}
      </OnboardingCard>
    </div>
  )
}
