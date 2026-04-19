import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  UserX,
} from 'lucide-react'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { envConfig } from '@/config/env.config'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { detectExtension } from '@/lib/extension'
import { getProfileDetailsFromExtension } from '@/utils/utils'
import { getTwitterProfileDetailsFromExtension } from '@/features/twitter-commenting/utils/extension'
import {
  useLinkProfile,
  useLinkTwitterProfile,
} from '@/features/users/query/profile.query'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import type { IProfile } from '@/features/users/interface/profile.interface'

type BannerState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'no-extension' }
  | { kind: 'mismatch'; extensionName: string; agentName: string }

export function AgentReconnectBanner({ profile }: { profile: IProfile }) {
  const chromeExtensionAvailable = useFeatureFlagEnabled(
    'chrome-extension-available'
  )
  const { linkProfile, isLinkingProfile } = useLinkProfile()
  const { linkTwitterProfile, isLinkingTwitterProfile } =
    useLinkTwitterProfile()
  const [state, setState] = useState<BannerState>({ kind: 'idle' })

  const isTwitter = profile.platform === 'twitter'
  const platformLabel = isTwitter ? 'X' : 'LinkedIn'
  const isLinking = isLinkingProfile || isLinkingTwitterProfile

  const checkExtension = useCallback(async () => {
    setState({ kind: 'checking' })
    const { installed } = await detectExtension()
    if (!installed) {
      setState({ kind: 'no-extension' })
      return false
    }
    setState({ kind: 'idle' })
    return true
  }, [])

  const handleReconnect = useCallback(async () => {
    setState({ kind: 'checking' })

    const { installed } = await detectExtension()
    if (!installed) {
      setState({ kind: 'no-extension' })
      return
    }

    if (isTwitter) {
      try {
        const details = await getTwitterProfileDetailsFromExtension()
        if (!details?.screenName) {
          setState({ kind: 'idle' })
          window.open('https://x.com', '_blank')
          return
        }
        if (
          profile.screenName &&
          details.screenName !== profile.screenName
        ) {
          setState({
            kind: 'mismatch',
            extensionName: `@${details.screenName}`,
            agentName: `@${profile.screenName}`,
          })
          return
        }
        await linkTwitterProfile(details)
      } catch {
        setState({ kind: 'idle' })
      }
    } else {
      try {
        const details = await getProfileDetailsFromExtension()
        if (!details?.publicIdentifier) {
          setState({ kind: 'idle' })
          window.open('https://www.linkedin.com', '_blank')
          return
        }
        if (
          profile.publicIdentifier &&
          details.publicIdentifier !== profile.publicIdentifier
        ) {
          setState({
            kind: 'mismatch',
            extensionName: `${details.firstName ?? ''} ${details.lastName ?? ''}`.trim() || details.publicIdentifier,
            agentName: `${profile.firstName} ${profile.lastName}`.trim() || profile.publicIdentifier,
          })
          return
        }
        await linkProfile(details)
      } catch {
        setState({ kind: 'idle' })
      }
    }

    setState({ kind: 'idle' })
  }, [isTwitter, profile, linkProfile, linkTwitterProfile])

  if (profile.status !== ProfileStatusEnum.ACTION_REQUIRED) return null

  if (state.kind === 'no-extension') {
    return (
      <Alert className='mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20'>
        <AlertTriangle className='text-amber-600' />
        <AlertTitle className='text-amber-800 dark:text-amber-300'>
          Extension not detected
        </AlertTitle>
        <AlertDescription>
          <p>
            The Commentify Chrome extension is required to reconnect your{' '}
            {platformLabel} account.
          </p>
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            {chromeExtensionAvailable ? (
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  window.open(
                    envConfig.chromeWebStoreUrl,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <ExternalLink className='mr-1.5 size-3.5' />
                Add to Chrome
              </Button>
            ) : (
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  window.open(
                    envConfig.extensionDownloadUrl,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <Download className='mr-1.5 size-3.5' />
                Download extension
              </Button>
            )}
            <Button
              size='sm'
              variant='ghost'
              disabled={state.kind !== 'no-extension'}
              onClick={async () => {
                const ok = await checkExtension()
                if (ok) await handleReconnect()
              }}
            >
              <RefreshCw className='mr-1.5 size-3.5' />
              Check again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (state.kind === 'mismatch') {
    return (
      <Alert variant='destructive' className='mb-6'>
        <UserX />
        <AlertTitle>Wrong account detected</AlertTitle>
        <AlertDescription>
          <p>
            You're logged into <strong>{state.extensionName}</strong> but this
            agent is linked to <strong>{state.agentName}</strong>. Please switch
            to the correct {platformLabel} account and try again.
          </p>
          <div className='mt-3'>
            <Button size='sm' variant='outline' onClick={handleReconnect}>
              <RefreshCw className='mr-1.5 size-3.5' />
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className='mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20'>
      <AlertTriangle className='text-amber-600' />
      <AlertTitle className='text-amber-800 dark:text-amber-300'>
        {platformLabel} connection lost
      </AlertTitle>
      <AlertDescription>
        <p>
          Your {platformLabel} connection expired or was revoked. Reconnect to
          resume this agent.
        </p>
        <div className='mt-3'>
          <Button
            size='sm'
            onClick={handleReconnect}
            disabled={isLinking || state.kind === 'checking'}
          >
            {isLinking || state.kind === 'checking' ? (
              <>
                <Loader2 className='mr-1.5 size-3.5 animate-spin' />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className='mr-1.5 size-3.5' />
                Reconnect
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
