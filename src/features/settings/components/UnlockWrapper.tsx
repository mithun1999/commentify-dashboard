import { Lock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function UnlockWrapper({
  children,
  isUnlocked,
}: {
  children: React.ReactNode
  isUnlocked: boolean
}) {
  if (isUnlocked) {
    return children
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='group relative cursor-not-allowed'>
            <div className='pointer-events-none'>{children}</div>
            <div className='bg-background/10 absolute inset-0 flex items-center justify-center rounded-md backdrop-blur-[1px]'>
              <Lock className='text-muted-foreground h-8 w-8' />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side='right' className='max-w-xs'>
          <p>Upgrade to Premium to unlock this feature</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
