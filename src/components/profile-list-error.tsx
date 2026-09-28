import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Shown when the account list could not be loaded and nothing is cached. A
 * failed read is not "no accounts connected": it must never render the
 * connect card or send the user back through setup.
 */
export function ProfileListError({
  message,
  onRetry,
  isRetrying,
}: {
  message?: string
  onRetry: () => void
  isRetrying?: boolean
}) {
  return (
    <div className='flex h-full w-full items-center'>
      <div className='w-full p-4 text-center'>
        <Card>
          <CardHeader>
            <CardTitle>We couldn't load your accounts</CardTitle>
            <CardDescription>
              {message ||
                'Something went wrong while loading your connected accounts. Your accounts are still connected.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='mt-2'>
            <Button onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ProfileListError
