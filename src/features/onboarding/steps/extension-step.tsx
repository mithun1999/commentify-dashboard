'use client'

import { useState, useEffect, useRef } from 'react'
import { envConfig } from '@/config/env.config'
import {
  Download,
  CheckCircle2,
  Info,
  ToggleRight,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  MessageCircle,
  Upload,
} from 'lucide-react'
import { Crisp } from 'crisp-sdk-web'
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
import { useTrackStepView } from '../hooks/useTrackStepView'

const INSTALL_STEPS: {
  icon: typeof Download
  title: string
  description: string
  action?: { label: string; copyText: string; copiedLabel: string }
}[] = [
  {
    icon: Download,
    title: 'Download & extract',
    description:
      'Download the extension ZIP below. Your browser may auto-extract it. If not, right-click the ZIP and choose "Extract All".',
  },
  {
    icon: Copy,
    title: 'Open the Extensions page',
    description: 'Copy the address below and paste it into your browser\'s address bar.',
    action: { label: 'Copy chrome://extensions', copyText: 'chrome://extensions', copiedLabel: 'Copied!' },
  },
  {
    icon: ToggleRight,
    title: 'Turn on Developer mode',
    description:
      'In the top-right corner of the extensions page, flip the "Developer mode" toggle ON.',
  },
  {
    icon: Upload,
    title: 'Load the extension',
    description:
      'Click the "Load unpacked" button that appeared, then select the folder you extracted in step 1.',
  },
  {
    icon: CheckCircle2,
    title: "You're all set!",
    description:
      'Come back to this page and click "Check installation" below.',
  },
]

export function ExtensionStep() {
  useTrackStepView('extension')
  const posthog = usePostHog()
  const [isChecking, setIsChecking] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { data: user } = useGetUserQuery()
  const { data, updateData, markStepCompleted } = useOnboarding()
  const { updateOnboardingStatus, updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const isInstalled = data.isExtensionInstalled
  const hasCheckedOnMount = useRef(false)
  const [copiedAction, setCopiedAction] = useState<string | null>(null)

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
            nextStep='/onboarding/agent-type'
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
                <div className='space-y-1 pt-0.5'>
                  <p className='text-sm font-medium leading-tight'>
                    {step.title}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {step.description}
                  </p>
                  {step.action && (
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(step.action!.copyText)
                        setCopiedAction(step.action!.copyText)
                        setTimeout(() => setCopiedAction(null), 2000)
                      }}
                      className='text-primary hover:text-primary/80 mt-1 inline-flex items-center gap-1 text-xs font-medium underline transition-colors'
                    >
                      {copiedAction === step.action.copyText ? (
                        <>
                          <Check className='h-3 w-3' />
                          {step.action.copiedLabel}
                        </>
                      ) : (
                        <>
                          <Copy className='h-3 w-3' />
                          {step.action.label}
                        </>
                      )}
                    </button>
                  )}
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
            <button
              onClick={() => {
                try { Crisp.chat.open() } catch { /* Crisp not initialized in dev */ }
              }}
              className='text-muted-foreground hover:text-foreground mt-1 inline-flex items-center justify-center gap-1.5 text-xs transition-colors'
            >
              <MessageCircle className='h-3.5 w-3.5' />
              Need help? Chat with us
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
