'use client'

import { useState, useEffect, useRef } from 'react'
import { envConfig } from '@/config/env.config'
import {
  Download,
  CheckCircle2,
  Info,
  FolderOpen,
  Puzzle,
  ToggleRight,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import extensionImage from '@/assets/images/install-extension.png'
import { useOnboarding } from '@/stores/onboarding.store'
import { checkIsExtensionInstalled } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const INSTALL_STEPS = [
  {
    icon: Download,
    title: 'Download the extension',
    description: 'Click the button below to download the extension as a ZIP file.',
  },
  {
    icon: FolderOpen,
    title: 'Unzip the file',
    description: 'Extract the downloaded ZIP file to a folder on your computer.',
  },
  {
    icon: Puzzle,
    title: 'Open Chrome Extensions',
    description:
      'Go to chrome://extensions in your browser and enable "Developer mode" in the top right.',
  },
  {
    icon: FolderOpen,
    title: 'Load the extension',
    description:
      'Click "Load unpacked" and select the extracted folder.',
  },
  {
    icon: ToggleRight,
    title: 'Done!',
    description:
      'The extension is now installed. Come back here and click "Check installation".',
  },
]

export function ExtensionStep() {
  const posthog = usePostHog()
  const [isChecking, setIsChecking] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { data: user } = useGetUserQuery()
  const { data, updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatus, updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const isInstalled = data.isExtensionInstalled
  const hasCheckedOnMount = useRef(false)

  const checkExtensionInstallation = async () => {
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
        setShowGuide(false)

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
  }

  useEffect(() => {
    if (hasCheckedOnMount.current || isInstalled) return
    hasCheckedOnMount.current = true
    checkExtensionInstallation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = () => {
    posthog?.capture('onboarding_extension_download_clicked')
    if (envConfig.extensionDownloadUrl) {
      window.open(envConfig.extensionDownloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

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
                onClick={() => {
                  posthog?.capture('onboarding_extension_install_clicked')
                  setShowGuide(true)
                }}
              >
                <Download className='mr-2 h-4 w-4' />
                Install Extension
              </Button>
              <button
                className='text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 text-sm underline transition-colors'
                disabled={isChecking}
                onClick={() => {
                  posthog?.capture('onboarding_extension_check_again_clicked')
                  checkExtensionInstallation()
                }}
              >
                {isChecking ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RefreshCw className='h-3.5 w-3.5' />
                )}
                {isChecking ? 'Checking...' : 'Already installed? Check again'}
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
            onNext={async () => {
              const currentStep = user?.metadata?.onboarding?.step ?? 0
              if (currentStep < 1) {
                await updateOnboardingStatusAsync({ status: 'in-progress', step: 1 })
              }
              return true
            }}
          />
        )}
      </OnboardingCard>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>How to Install the Extension</DialogTitle>
            <DialogDescription>
              Follow these steps to manually install the Commentify extension.
            </DialogDescription>
          </DialogHeader>

          <ol className='space-y-4 py-2'>
            {INSTALL_STEPS.map((step, index) => (
              <li key={index} className='flex gap-3'>
                <div className='bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
                  {index + 1}
                </div>
                <div className='space-y-0.5 pt-0.5'>
                  <p className='text-sm font-medium leading-tight'>
                    {step.title}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className='flex flex-col gap-2 pt-2'>
            <Button onClick={handleDownload} disabled={!envConfig.extensionDownloadUrl}>
              <Download className='mr-2 h-4 w-4' />
              Download ZIP
            </Button>
            <button
              className='text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm underline transition-colors'
              disabled={isChecking}
              onClick={checkExtensionInstallation}
            >
              {isChecking ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <RefreshCw className='h-3.5 w-3.5' />
              )}
              {isChecking ? 'Checking...' : 'Check installation'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
