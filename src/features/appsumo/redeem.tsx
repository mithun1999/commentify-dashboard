import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAxiosStatus,
  getReadableErrorMessage,
  isApiRequestError,
} from '@/lib/connection-recovery'
import { rememberPostLoginRedirect } from '@/lib/post-login-redirect'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AiKeysForm } from '@/features/ai-keys/components/ai-keys-form'
import {
  openRouterKeyOf,
  useAiKeysQuery,
} from '@/features/ai-keys/query/ai-keys.query'
import AuthLayout from '@/features/auth/auth-layout'
import {
  useGetUserQuery,
  UserQueryEnum,
} from '@/features/auth/query/user.query'
import { signOut } from '@/features/auth/utils/auth.util'
import {
  type AppsumoLicense,
  type BilledPlan,
  getAppsumoLicense,
  linkAppsumoLicense,
  redeemAppsumoCode,
  type RedeemResult,
} from './api/appsumo.api'
import {
  clearPendingClaim,
  markClaimRefused,
  type PendingClaim,
  readPendingClaim,
  savePendingClaim,
} from './claim'
import { StartWithOneNote } from './components/start-with-one'

const LICENSE_QUERY_KEY = ['appsumo-license']

// One exchange per code per page load: the code dies on first use, so a
// second request (a remount, a double effect) would only report "expired".
const redeeming = new Map<string, Promise<RedeemResult>>()

function statusOf(error: unknown): number | undefined {
  if (isApiRequestError(error) && typeof error.status === 'number') {
    return error.status
  }
  return getAxiosStatus(error)
}

function planLine(tier?: number, accounts?: number, withTier = true) {
  if (!tier) return 'Your AppSumo license'
  const count = accounts ?? 1
  const what = `${count} ${count === 1 ? 'account' : 'accounts'} with commenting and posting`
  if (withTier) return `Tier ${tier}: ${what}`
  return what.charAt(0).toUpperCase() + what.slice(1)
}

function formatDay(value?: string) {
  if (!value) return null
  const day = new Date(value)
  if (Number.isNaN(day.getTime())) return null
  return day.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout redirectIfSignedIn={false}>
      <Card className='gap-0 py-0'>
        <CardContent className='space-y-5 p-6'>{children}</CardContent>
      </Card>
    </AuthLayout>
  )
}

function Waiting({ label }: { label: string }) {
  return (
    <Shell>
      <div className='text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm'>
        <Loader2 className='size-4 animate-spin' />
        {label}
      </div>
    </Shell>
  )
}

function Problem({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Shell>
      <div className='flex items-start gap-3'>
        <AlertCircle className='mt-0.5 size-5 shrink-0 text-amber-600' />
        <div className='space-y-3'>
          <h1 className='text-lg font-semibold'>{title}</h1>
          {children}
        </div>
      </div>
    </Shell>
  )
}

type Outcome =
  | { kind: 'already-linked' }
  | { kind: 'deactivated' }
  | { kind: 'redeem-failed'; message: string }
  | { kind: 'link-refused'; message: string }
  | { kind: 'paid-plan'; message: string; plans: BilledPlan[] }
  | { kind: 'link-failed'; message: string }

/**
 * Where AppSumo sends a buyer after they click Activate (the OAuth redirect
 * URL). The one-time code is exchanged at once for a claim that waits up to a
 * day, so the buyer can create an account or sign in first; the license is
 * linked as soon as they are signed in, and they add their AI key before
 * setting up their agents.
 */
export default function AppsumoRedeem({ code }: { code?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const isSessionLoaded = useAuthStore((s) => s.isSessionLoaded)
  const signedIn = Boolean(session?.user?.id)

  const [claim, setClaim] = useState<PendingClaim | null>(() =>
    readPendingClaim()
  )
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [justLinked, setJustLinked] = useState<AppsumoLicense | null>(null)
  const [tierRetries, setTierRetries] = useState(0)
  const linkingToken = useRef<string | null>(null)

  const [switching, setSwitching] = useState(false)

  const afterLinked = async (license: AppsumoLicense) => {
    clearPendingClaim()
    // The account now needs its own AI key; wait for the user to say so before
    // showing the next step, or Continue would skip the key.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] }),
      queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEY }),
    ])
    setOutcome(null)
    setJustLinked(license)
    setClaim(null)
  }

  // The buyer chose to end the plan they pay for: we cancel it at the end of
  // what they have paid and link in the same call.
  const switchToLicense = async () => {
    if (!claim || switching) return
    setSwitching(true)
    try {
      await afterLinked(
        await linkAppsumoLicense(claim.token, { cancelCurrentPlan: true })
      )
    } catch (error) {
      setOutcome({
        kind: 'link-failed',
        message: getReadableErrorMessage(
          error,
          'We could not switch your plan. Your current plan is unchanged; try again in a minute.'
        ),
      })
    } finally {
      setSwitching(false)
    }
  }

  // 1. Exchange the code, unless this same link was already exchanged.
  const needsRedeem = Boolean(code) && claim?.code !== code && !outcome
  useEffect(() => {
    if (!code || !needsRedeem) return
    let request = redeeming.get(code)
    if (!request) {
      request = redeemAppsumoCode(code)
      redeeming.set(code, request)
    }
    request
      .then((result) => {
        if (result.state === 'claimable') {
          const saved = {
            token: result.claimToken,
            tier: result.tier,
            accounts: result.accounts,
            planTier: result.planTier,
            code,
          }
          savePendingClaim(saved)
          setClaim(readPendingClaim() ?? { ...saved, expiresAt: Date.now() })
        } else if (result.state === 'deactivated') {
          setOutcome({ kind: 'deactivated' })
        } else if (!result.yours) {
          setOutcome({ kind: 'already-linked' })
        }
        // Their own license, from AppSumo's Launch button: nothing to report,
        // the page shows it once the code leaves the address bar.
      })
      .catch((error) =>
        setOutcome({
          kind: 'redeem-failed',
          message: getReadableErrorMessage(
            error,
            'We could not confirm your license with AppSumo. Go back to AppSumo and click Activate again.'
          ),
        })
      )
      .finally(() => {
        // The code is spent either way; keep it out of the address bar.
        navigate({ to: '/appsumo', search: {}, replace: true })
      })
  }, [code, needsRedeem, navigate])

  // 2. Signed out with a claim: they come back here after signing in. The
  // onboarding guard also sends them back if they arrive somewhere else.
  useEffect(() => {
    if (isSessionLoaded && !signedIn && claim) {
      rememberPostLoginRedirect('/appsumo')
    }
  }, [isSessionLoaded, signedIn, claim])

  // 3. Signed in with a claim: link it.
  useEffect(() => {
    if (!signedIn || !claim || outcome || needsRedeem) return
    if (linkingToken.current === `${claim.token}:${tierRetries}`) return
    linkingToken.current = `${claim.token}:${tierRetries}`

    linkAppsumoLicense(claim.token)
      .then(afterLinked)
      .catch((error) => {
        const status = statusOf(error)
        const message = getReadableErrorMessage(
          error,
          'We could not activate your license. Try again in a minute.'
        )
        if (status === 503 && tierRetries < 5) {
          // AppSumo has not told us the tier yet; it usually lands in seconds.
          setTimeout(() => setTierRetries((n) => n + 1), 4000)
          return
        }
        if (status === 409) {
          // The claim is kept for another account, but this one is no longer
          // sent back here, so it can reach Billing and the rest of the app.
          if (session?.user?.id) markClaimRefused(session.user.id)
          const body = (
            error as { body?: { code?: string; plans?: BilledPlan[] } }
          )?.body
          setOutcome(
            body?.code === 'PAID_PLAN'
              ? { kind: 'paid-plan', message, plans: body.plans ?? [] }
              : { kind: 'link-refused', message }
          )
          return
        }
        if (status === 400) clearPendingClaim()
        setOutcome({ kind: 'link-failed', message })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, claim, outcome, needsRedeem, tierRetries])

  const { data: user } = useGetUserQuery()
  const licenseQuery = useQuery({
    queryKey: LICENSE_QUERY_KEY,
    queryFn: getAppsumoLicense,
    enabled: signedIn && !claim,
    meta: { suppressGlobalErrorToast: true },
  })
  const keysQuery = useAiKeysQuery(
    signedIn &&
      Boolean(user?.aiKeyRequired) &&
      user?.metadata?.onboarding?.status === 'completed'
  )

  const switchAccount = async () => {
    rememberPostLoginRedirect('/appsumo')
    await signOut()
    setOutcome(null)
    linkingToken.current = null
    navigate({ to: '/sign-in' })
  }

  const continueSetup = () => {
    const onboarded = user?.metadata?.onboarding?.status === 'completed'
    navigate({ to: onboarded ? '/' : '/onboarding/agent-type' })
  }

  // ----- Outcomes -----

  if (outcome?.kind === 'already-linked') {
    if (!isSessionLoaded) return <Waiting label='Loading…' />
    if (signedIn) {
      return (
        <Problem title='This license is on another account'>
          <p className='text-muted-foreground text-sm'>
            You are signed in as {session?.user?.email}. Sign in to the account
            that activated this license to use it.
          </p>
          <Button variant='outline' onClick={switchAccount}>
            Use a different account
          </Button>
        </Problem>
      )
    }
    return (
      <Problem title='This license is already active'>
        <p className='text-muted-foreground text-sm'>
          It is linked to a Commentify account. Sign in to that account to use
          it.
        </p>
        <Button onClick={() => navigate({ to: '/sign-in' })}>Sign in</Button>
      </Problem>
    )
  }
  if (outcome?.kind === 'deactivated') {
    return (
      <Problem title='This license is no longer active'>
        <p className='text-muted-foreground text-sm'>
          AppSumo shows it as refunded or replaced. If you upgraded, click
          Activate on your new license on AppSumo.
        </p>
      </Problem>
    )
  }
  // AppSumo codes work once. Reopening the Activate link after the license is
  // already on this account is not a failure: show the license instead.
  const spentLinkOnLiveLicense =
    outcome?.kind === 'redeem-failed' && signedIn && Boolean(user?.appsumoTier)
  if (outcome?.kind === 'redeem-failed' && signedIn && !user) {
    return <Waiting label='Loading your license…' />
  }
  if (
    (outcome?.kind === 'redeem-failed' && !spentLinkOnLiveLicense) ||
    outcome?.kind === 'link-failed'
  ) {
    return (
      <Problem title='We could not activate your license'>
        <p className='text-muted-foreground text-sm'>{outcome.message}</p>
        <p className='text-muted-foreground text-sm'>
          If it keeps happening, email support@commentify.co with the email you
          use on AppSumo.
        </p>
      </Problem>
    )
  }
  if (outcome?.kind === 'paid-plan') {
    const plan = outcome.plans[0]
    const price =
      plan?.price && plan?.interval
        ? ` ($${plan.price}/${plan.interval === 'yearly' ? 'year' : 'month'})`
        : ''
    const until = formatDay(plan?.renewsAt)
    return (
      <Shell>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold'>
            Switch to your AppSumo license?
          </h1>
          <p className='text-muted-foreground text-sm'>
            {plan?.onTrial
              ? `This account is on a free trial${plan.name ? ` of ${plan.name}` : ''}. Activating your license cancels the trial, so you're never charged for it.`
              : `This account pays for ${plan?.name ?? 'a Commentify plan'}${price}. Activating your license cancels it${until ? ` on ${until}, the end of what you've paid for` : ` at the end of what you've paid for`}, so you're never charged for both.`}
          </p>
          <p className='text-muted-foreground text-sm'>
            Your license takes over straight away. Signed in as{' '}
            {session?.user?.email}.
          </p>
        </div>
        <div className='space-y-2'>
          <Button
            className='w-full'
            disabled={switching}
            onClick={switchToLicense}
          >
            {switching && <Loader2 className='size-4 animate-spin' />}
            {switching ? 'Switching…' : 'Cancel my plan and activate'}
          </Button>
          <Button
            variant='outline'
            className='w-full'
            disabled={switching}
            onClick={switchAccount}
          >
            Use a different account
          </Button>
        </div>
      </Shell>
    )
  }
  if (outcome?.kind === 'link-refused') {
    return (
      <Problem title='This account cannot take the license'>
        <p className='text-muted-foreground text-sm'>{outcome.message}</p>
        <p className='text-muted-foreground text-sm'>
          Signed in as {session?.user?.email}.
        </p>
        <Button variant='outline' onClick={switchAccount}>
          Use a different account
        </Button>
      </Problem>
    )
  }

  // ----- In progress -----

  if (needsRedeem)
    return <Waiting label='Confirming your license with AppSumo…' />
  if (!isSessionLoaded) return <Waiting label='Loading…' />

  if (claim && !signedIn) {
    return (
      <Shell>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold'>
            Activate your AppSumo license
          </h1>
          <p className='text-muted-foreground text-sm'>
            {planLine(claim.tier, claim.accounts)}, running on your own AI key.
            Create your Commentify account, or sign in, to activate it.
          </p>
        </div>
        <div className='space-y-2'>
          <Button
            className='w-full'
            onClick={() => navigate({ to: '/sign-up' })}
          >
            Create account
          </Button>
          <Button
            variant='outline'
            className='w-full'
            onClick={() => navigate({ to: '/sign-in' })}
          >
            I already have an account
          </Button>
        </div>
        <p className='text-muted-foreground text-xs'>
          Your activation is saved in this browser for 24 hours.
        </p>
      </Shell>
    )
  }

  if (claim && signedIn) {
    return (
      <Waiting
        label={
          tierRetries > 0
            ? 'Waiting for AppSumo to send your license details…'
            : 'Activating your license…'
        }
      />
    )
  }

  if (!signedIn) {
    return (
      <Problem title='Open this page from AppSumo'>
        <p className='text-muted-foreground text-sm'>
          Go to your AppSumo account, find Commentify under your products and
          click Activate. You will come back here to finish.
        </p>
        <Button variant='outline' onClick={() => navigate({ to: '/sign-in' })}>
          Sign in to Commentify
        </Button>
      </Problem>
    )
  }

  // ----- Signed in, nothing to link: show the license and its AI key -----

  const license = justLinked ?? licenseQuery.data
  if (!justLinked && (licenseQuery.isLoading || !user)) {
    return <Waiting label='Loading your license…' />
  }
  if (!license || license.status === 'deactivated') {
    return (
      <Problem
        title={
          license
            ? 'This license is no longer active'
            : 'No AppSumo license on this account'
        }
      >
        <p className='text-muted-foreground text-sm'>
          {license
            ? 'AppSumo shows it as refunded. If you bought a new one, click Activate on it on AppSumo.'
            : `Signed in as ${session?.user?.email}. To activate a license, go to your AppSumo account and click Activate on Commentify.`}
        </p>
        <Button variant='outline' onClick={() => navigate({ to: '/' })}>
          Go to your dashboard
        </Button>
      </Problem>
    )
  }

  // A second (or later) license on the account: its accounts add up.
  const stacked =
    Boolean(license.totalAccounts) &&
    (license.totalAccounts ?? 0) > (license.accounts ?? 0)
  const justAdded = stacked && Boolean(justLinked)
  const onboarded = user?.metadata?.onboarding?.status === 'completed'
  // Setup asks for the key after the first account's preview. Someone already
  // set up (redeeming on an existing account) skips setup, so they add it here.
  const askKeyHere = onboarded && Boolean(user?.aiKeyRequired)
  const openRouter = openRouterKeyOf(keysQuery.data)
  const keyReady = Boolean(openRouter) && openRouter?.status !== 'invalid'

  return (
    <Shell>
      <div className='flex items-start gap-3'>
        <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-green-600' />
        <div className='space-y-1'>
          <h1 className='text-lg font-semibold'>
            {justAdded
              ? `License added: ${license.accounts} more ${license.accounts === 1 ? 'account' : 'accounts'}`
              : stacked
                ? 'Your licenses are active'
                : license.tier
                  ? `Your Tier ${license.tier} license is active`
                  : 'Your license is active'}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {stacked
              ? `You ${justAdded ? 'now have' : 'have'} ${license.totalAccounts} accounts across your licenses, with Tier ${license.totalTier} limits on all of them.`
              : // The heading already names the tier.
                `${planLine(license.tier, license.accounts, false)}.`}
          </p>
        </div>
      </div>

      {askKeyHere ? (
        <div className='space-y-3'>
          <div className='space-y-1'>
            <h2 className='font-medium'>
              {keyReady ? 'Your AI keys' : 'Add your AI key'}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {keyReady
                ? 'Your agents write with these keys, so you pay your AI provider directly for what they use.'
                : "Your agents write with your own AI key, so you pay your AI provider directly for what they use. They can't run until it's added."}
            </p>
          </div>
          <AiKeysForm />
        </div>
      ) : (
        !onboarded && <StartWithOneNote accounts={license.accounts} />
      )}

      <Button
        className='w-full'
        disabled={askKeyHere && !keyReady}
        onClick={continueSetup}
      >
        {onboarded ? 'Go to your dashboard' : 'Set up your first account'}
      </Button>
      {askKeyHere && !keyReady && (
        <p className='text-muted-foreground text-center text-xs'>
          Save your OpenRouter key to continue.
        </p>
      )}
    </Shell>
  )
}
