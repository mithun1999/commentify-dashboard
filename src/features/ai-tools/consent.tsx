import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  IconAlertTriangle,
  IconCheck,
  IconExternalLink,
  IconLoader2,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAxiosStatus,
  getReadableErrorMessage,
} from '@/lib/connection-recovery'
import { rememberPostLoginRedirect } from '@/lib/post-login-redirect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AuthLayout from '@/features/auth/auth-layout'
import { signOut } from '@/features/auth/utils/auth.util'
import { approveConsentRequest, denyConsentRequest } from './api/mcp.api'
import { ClientBadge } from './components/client-badge'
import { useConsentRequestQuery } from './query/mcp.query'

const CAN_DO = [
  'See your profiles, comment queue, posting schedule, stats and settings.',
  'Draft, edit, reschedule and approve comments and posts. Approved ones go out at their scheduled time.',
  'Publish a post straight away, when you ask it to.',
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout redirectIfSignedIn={false}>
      <Card className='gap-0 py-0'>
        <CardContent className='space-y-5 p-6'>{children}</CardContent>
      </Card>
    </AuthLayout>
  )
}

/**
 * The one screen between "Connect" in Claude or ChatGPT and a working
 * connection. Signed-out users sign in and come straight back here; the
 * request itself lives on the server for ten minutes.
 */
export default function McpConsent({ requestId }: { requestId: string }) {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isSessionLoaded = useAuthStore((s) => s.isSessionLoaded)
  const signedIn = Boolean(session?.user?.id)
  const here = `/oauth/consent?request=${encodeURIComponent(requestId)}`

  useEffect(() => {
    if (isSessionLoaded && !signedIn) {
      rememberPostLoginRedirect(here)
      navigate({ to: '/sign-in' })
    }
  }, [isSessionLoaded, signedIn, here, navigate])

  const { data, error, isLoading } = useConsentRequestQuery(requestId, signedIn)
  const [leaving, setLeaving] = useState<'allow' | 'cancel' | null>(null)

  const finish = async (choice: 'allow' | 'cancel') => {
    if (leaving) return
    setLeaving(choice)
    try {
      const { redirectUrl } =
        choice === 'allow'
          ? await approveConsentRequest(requestId)
          : await denyConsentRequest(requestId)
      window.location.assign(redirectUrl)
    } catch (err) {
      setLeaving(null)
      // The API client rejects with a plain { status, message }, and the
      // server's messages are written for this screen.
      toast.error(
        (err as { message?: string })?.message ||
          getReadableErrorMessage(
            err,
            'Something went wrong. Start again from your AI app.'
          )
      )
    }
  }

  const switchAccount = async () => {
    rememberPostLoginRedirect(here)
    await signOut()
    navigate({ to: '/sign-in' })
  }

  if (!requestId) {
    return (
      <Shell>
        <h1 className='text-lg font-semibold'>This link is incomplete</h1>
        <p className='text-muted-foreground text-sm'>
          Go back to your AI app and click Connect again.
        </p>
      </Shell>
    )
  }

  if (!isSessionLoaded || !signedIn || isLoading) {
    return (
      <Shell>
        <div className='text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm'>
          <IconLoader2 className='size-4 animate-spin' />
          Loading…
        </div>
      </Shell>
    )
  }

  if (error || !data) {
    // The API client rejects with a plain { status, message }.
    const status =
      (error as { status?: number })?.status ?? getAxiosStatus(error)
    const expired = status === 410
    return (
      <Shell>
        <h1 className='text-lg font-semibold'>
          {expired
            ? 'This connection link has expired'
            : 'Something went wrong'}
        </h1>
        <p className='text-muted-foreground text-sm'>
          {expired
            ? 'Links last ten minutes and work once. Go back to your AI app and click Connect again.'
            : 'Go back to your AI app and click Connect again. If it keeps happening, message us from the help button in Commentify.'}
        </p>
      </Shell>
    )
  }

  const known = Boolean(data.knownAs)

  return (
    <Shell>
      <div className='flex items-center gap-3'>
        {data.client.logoUri?.startsWith('https://') ? (
          <img
            src={data.client.logoUri}
            alt=''
            className='size-11 rounded-lg border object-contain'
          />
        ) : (
          <ClientBadge name={data.client.name} className='size-11 text-sm' />
        )}
        <div className='min-w-0'>
          <h1 className='text-lg leading-snug font-semibold'>
            {data.client.name} wants to use your Commentify account
          </h1>
          <p className='text-muted-foreground text-sm'>
            Signed in as {session?.user?.email}.{' '}
            <button
              type='button'
              className='underline underline-offset-2'
              onClick={switchAccount}
            >
              Not you?
            </button>
          </p>
        </div>
      </div>

      {known ? (
        <p className='text-muted-foreground text-sm'>
          {data.knownAs === 'An app on this computer'
            ? 'This connects an app running on this computer.'
            : `This connects ${data.knownAs} (${data.redirectHost}).`}
        </p>
      ) : (
        <Alert className='border-amber-500/50 bg-amber-500/5'>
          <IconAlertTriangle className='size-4 text-amber-600' />
          <AlertTitle>We don't recognise this app</AlertTitle>
          <AlertDescription>
            Allowing it sends you to {data.redirectHost}. Only continue if you
            started this connection yourself.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <p className='mb-2 text-sm font-medium'>It will be able to:</p>
        <ul className='space-y-2'>
          {CAN_DO.map((line) => (
            <li key={line} className='flex gap-2 text-sm'>
              <IconCheck className='text-primary mt-0.5 size-4 shrink-0' />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {data.eligible ? (
        <div className='space-y-2'>
          <Button
            className='w-full'
            onClick={() => finish('allow')}
            disabled={Boolean(leaving)}
          >
            {leaving === 'allow' && (
              <IconLoader2 className='mr-2 size-4 animate-spin' />
            )}
            Allow
          </Button>
          <Button
            variant='ghost'
            className='w-full'
            onClick={() => finish('cancel')}
            disabled={Boolean(leaving)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className='space-y-3 rounded-lg border p-4'>
          <p className='text-sm font-medium'>
            Connecting AI tools is part of Pro
          </p>
          <p className='text-muted-foreground text-sm'>
            Upgrade, then come back to this tab and refresh it. The link stays
            open for ten minutes.
          </p>
          <Button className='w-full' asChild>
            <a href='/plans' target='_blank' rel='noreferrer'>
              See plans
              <IconExternalLink className='ml-1 size-4' />
            </a>
          </Button>
          <Button
            variant='ghost'
            className='w-full'
            onClick={() => finish('cancel')}
            disabled={Boolean(leaving)}
          >
            Cancel
          </Button>
        </div>
      )}

      <p className='text-muted-foreground text-center text-xs'>
        You can disconnect it any time in Commentify, under AI tools.
      </p>
    </Shell>
  )
}
