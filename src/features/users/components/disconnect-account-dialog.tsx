import { useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getReadableErrorMessage } from '@/lib/connection-recovery'
import type {
  IDisconnectProfileResponse,
  IProfile,
} from '@/features/users/interface/profile.interface'
import { useDisconnectProfile } from '@/features/users/query/profile.query'
import {
  affectedAgentNames,
  profileDisplayName,
} from '@/features/users/utils/profile-display'

interface DisconnectAccountDialogProps {
  profile: IProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDisconnected?: (result: IDisconnectProfileResponse, profile: IProfile) => void
}

/**
 * The one confirmation flow for disconnecting an account, shared by Agent
 * Settings, the Agent Hub card menu and the account switcher so every entry
 * point revokes the same way. Does not need the extension: the revocation
 * happens on the backend.
 */
export function DisconnectAccountDialog({
  profile,
  open,
  onOpenChange,
  onDisconnected,
}: DisconnectAccountDialogProps) {
  const {
    disconnectProfile,
    isDisconnecting,
    disconnectError,
    resetDisconnectError,
  } = useDisconnectProfile({
    onSuccess: (result, disconnected) => {
      onOpenChange(false)
      onDisconnected?.(result, disconnected)
    },
  })

  useEffect(() => {
    if (!open) resetDisconnectError()
  }, [open, resetDisconnectError])

  if (!profile) return null

  const platformLabel = profile.platform === 'twitter' ? 'X' : 'LinkedIn'
  const agents = affectedAgentNames(profile)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isDisconnecting) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader className='text-left'>
          <AlertDialogTitle>
            Disconnect {profileDisplayName(profile)}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-3'>
              <p>
                This removes Commentify's access to your {platformLabel}{' '}
                account and stops every agent on it:
              </p>
              <ul className='list-disc pl-5'>
                {agents.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <ul className='space-y-1 text-sm'>
                <li>Queued comments and scheduled posts will not run.</li>
                <li>
                  Drafts, settings and history are kept. Anything already
                  published stays published.
                </li>
                <li>Your plan and billing are unchanged.</li>
                <li>
                  Reconnecting later needs your explicit approval, and every
                  agent comes back paused.
                </li>
              </ul>
              <p className='text-muted-foreground text-xs'>
                A comment or post that is being sent at this exact moment may
                still complete; nothing further will be sent.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {disconnectError && (
          <div
            role='alert'
            className='border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm'
          >
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
            <span>
              {getReadableErrorMessage(
                disconnectError,
                "We couldn't disconnect this account. Please try again."
              )}
            </span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisconnecting}>
            Keep connected
          </AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={isDisconnecting}
            onClick={() => {
              void disconnectProfile(profile).catch(() => {
                // Surfaced inline via disconnectError.
              })
            }}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                Disconnecting…
              </>
            ) : (
              'Disconnect account'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
