// components/ui/loading-button.tsx
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
}

export function LoadingButton({
  loading = false,
  children,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn('relative', className)}
      {...props}
    >
      {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
      {children}
    </Button>
  )
}
