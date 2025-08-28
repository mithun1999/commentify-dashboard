import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import commentifyLogo from '@/assets/images/logo.svg'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/theme-switch'

export function OnboardingHeader() {
  return (
    <header className='sticky top-0 z-40 backdrop-blur-md'>
      <div className='container flex h-16 items-center justify-between'>
        <div className='flex items-center gap-2'>
          <img src={commentifyLogo} alt='commentify' />
        </div>
        <div className='flex items-center gap-4'>
          <Link to='/'>
            <Button
              variant='ghost'
              size='sm'
              className='group text-muted-foreground hover:text-foreground text-sm'
            >
              Skip to dashboard
              <ChevronRight className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </Button>
          </Link>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
