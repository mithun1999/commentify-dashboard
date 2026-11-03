import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { IUser } from '@/features/auth/interface/user.interface'

/** How many accounts an AppSumo license covers, or undefined for anyone else. */
export function appsumoAccounts(user?: IUser | null): number | undefined {
  if (!user?.appsumoTier) return undefined
  return user.agents?.comment?.profiles ?? 1
}

/**
 * Setup connects one account; a license for several says where the rest go,
 * so nobody hunts for a way to add them here.
 */
export function StartWithOneNote({
  accounts,
  done = false,
}: {
  accounts?: number
  /** At the end of setup, when the first account is already connected. */
  done?: boolean
}) {
  const others = (accounts ?? 1) - 1
  if (others < 1) return null
  const rest = `${others} ${others === 1 ? 'account' : 'accounts'}`
  return (
    <Alert className='border-primary/30 bg-primary/5'>
      <Info className='size-4' />
      <AlertTitle>
        {done ? `Your other ${rest}` : 'Start with one account'}
      </AlertTitle>
      <AlertDescription>
        {done
          ? `Add them from your dashboard whenever you're ready. Each one gets the same setup you just did.`
          : `Connect one LinkedIn or X account now, yours or a client's, and watch your agents work on it. You'll add your other ${rest} from your dashboard after setup.`}
      </AlertDescription>
    </Alert>
  )
}
