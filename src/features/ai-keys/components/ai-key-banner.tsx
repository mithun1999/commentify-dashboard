import { Link, useLocation } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IUser } from '@/features/auth/interface/user.interface'
import { openRouterKeyOf, useAiKeysQuery } from '../query/ai-keys.query'

/**
 * Tells an account on its own AI keys that its agents can't run, and why.
 * Quiet while a key can't be checked: that is OpenRouter being briefly
 * unreachable, not something the customer has to fix.
 */
export function AiKeyBanner({ user }: { user: IUser }) {
  const location = useLocation()
  const { data: keys, isSuccess } = useAiKeysQuery(Boolean(user.aiKeyRequired))
  if (!user.aiKeyRequired || !isSuccess) return null
  if (location.pathname.startsWith('/ai-keys')) return null

  const key = openRouterKeyOf(keys)
  const message = !key
    ? "Your agents can't run until you add your OpenRouter key."
    : key.status === 'out_of_credit'
      ? "Your OpenRouter key is out of credit, so your agents can't run. Add credit, then check the key again."
      : key.status === 'invalid'
        ? "OpenRouter no longer accepts your key, so your agents can't run. Replace it."
        : null
  if (!message) return null

  return (
    <div className='relative flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-sm text-white'>
      <KeyRound className='h-4 w-4 shrink-0' />
      <span className='font-medium'>{message}</span>
      <Button
        size='sm'
        variant='secondary'
        className='h-7 bg-white/90 text-gray-900 hover:bg-white'
        asChild
      >
        <Link to='/ai-keys'>{key ? 'Fix it' : 'Add key'}</Link>
      </Button>
    </div>
  )
}
