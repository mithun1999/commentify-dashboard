import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useReconnectPromptStore } from '@/stores/reconnect-prompt.store'

function accountLabel(prompt: {
  platform: 'linkedin' | 'twitter'
  profile: { firstName?: string; lastName?: string; publicIdentifier?: string; screenName?: string }
}) {
  const { profile } = prompt
  const name = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
  const handle =
    prompt.platform === 'twitter'
      ? profile.screenName && `@${profile.screenName}`
      : profile.publicIdentifier && `@${profile.publicIdentifier}`
  return [name, handle].filter(Boolean).join(' · ') || 'this account'
}

/**
 * Asked whenever a link request meets an account the owner deliberately
 * disconnected. Nothing is restored until they confirm here; visiting the
 * platform, opening the extension, or signing in never reconnects on its own.
 */
export function ReconnectAccountDialog() {
  const prompt = useReconnectPromptStore((s) => s.prompt)
  const answer = useReconnectPromptStore((s) => s.answer)
  if (!prompt) return null

  const platformLabel = prompt.platform === 'twitter' ? 'X' : 'LinkedIn'

  return (
    <AlertDialog open onOpenChange={(open) => !open && answer(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reconnect {accountLabel(prompt)}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-2'>
              <p>
                You disconnected this {platformLabel} account from Commentify.
                Reconnecting stores a fresh session so your agents can work
                again.
              </p>
              <p>
                Every agent on it comes back paused. Comments and posts that
                were queued before you disconnected stay as drafts and need
                your approval again before anything is published.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => answer(false)}>
            Keep disconnected
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => answer(true)}>
            Reconnect account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
