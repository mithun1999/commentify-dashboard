import { useState, useEffect, useCallback } from 'react'
import { envConfig } from '@/config/env.config'
import {
  Download,
  FolderOpen,
  Puzzle,
  ToggleRight,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useProfileStore } from '@/stores/profile.store'
import { checkIsExtensionInstalled } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { useLinkProfile } from '@/features/users/query/profile.query'

const INSTALL_STEPS = [
  {
    icon: Download,
    title: 'Download the extension',
    description:
      'Click the button below to download the extension as a ZIP file.',
  },
  {
    icon: FolderOpen,
    title: 'Unzip the file',
    description:
      'Extract the downloaded ZIP file to a folder on your computer.',
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
    description: 'Click "Load unpacked" and select the extracted folder.',
  },
  {
    icon: ToggleRight,
    title: 'Done!',
    description:
      'The extension is now installed. Click "Check installation" below to continue.',
  },
]

export function ProfileConnectionGuard() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { linkProfile, isLinkingProfile } = useLinkProfile()

  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(
    null
  )
  const [isChecking, setIsChecking] = useState(false)

  const isDisconnected =
    activeProfile?.status === ProfileStatusEnum.ACTION_REQUIRED

  const checkExtension = useCallback(async () => {
    try {
      setIsChecking(true)
      const installed = await checkIsExtensionInstalled(
        envConfig.chromeExtensionId,
        envConfig.chromeExtensionIconUrl
      )
      setExtensionInstalled(installed)
    } catch {
      setExtensionInstalled(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (isDisconnected) {
      checkExtension()
    }
  }, [isDisconnected, checkExtension])

  const handleReconnect = async () => {
    const installed = await checkIsExtensionInstalled(
      envConfig.chromeExtensionId,
      envConfig.chromeExtensionIconUrl
    )
    if (!installed) {
      setExtensionInstalled(false)
      return
    }
    await linkProfile()
  }

  const handleDownload = () => {
    if (envConfig.extensionDownloadUrl) {
      window.open(
        envConfig.extensionDownloadUrl,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  const showInstallSteps = extensionInstalled === false

  return (
    <Dialog open={Boolean(isDisconnected)} modal={false}>
      <DialogContent
        hideCloseButton
        hideOverlay={false}
        className={showInstallSteps ? 'sm:max-w-lg' : undefined}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {extensionInstalled === null ? (
          <div className='flex items-center justify-center py-6'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        ) : showInstallSteps ? (
          <>
            <DialogHeader>
              <DialogTitle>Extension Not Detected</DialogTitle>
              <DialogDescription>
                The Commentify Chrome extension is required to reconnect your
                LinkedIn account. Follow these steps to install it.
              </DialogDescription>
            </DialogHeader>

            <ol className='space-y-4 py-2'>
              {INSTALL_STEPS.map((step, index) => (
                <li key={index} className='flex gap-3'>
                  <div className='bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
                    {index + 1}
                  </div>
                  <div className='space-y-0.5 pt-0.5'>
                    <p className='text-sm leading-tight font-medium'>
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
              <Button
                onClick={handleDownload}
                disabled={!envConfig.extensionDownloadUrl}
              >
                <Download className='mr-2 h-4 w-4' />
                Download ZIP
              </Button>
              <button
                className='text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm underline transition-colors'
                disabled={isChecking}
                onClick={checkExtension}
              >
                {isChecking ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RefreshCw className='h-3.5 w-3.5' />
                )}
                {isChecking ? 'Checking...' : 'Check installation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>We lost touch with LinkedIn 😢</DialogTitle>
              <DialogDescription>
                Your LinkedIn connection expired or was revoked. Let's reconnect
                so you can keep getting the most out of Commentify.
              </DialogDescription>
            </DialogHeader>
            <div className='flex justify-end'>
              <Button onClick={handleReconnect} disabled={isLinkingProfile}>
                {isLinkingProfile ? 'Reconnecting…' : 'Reconnect'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProfileConnectionGuard
