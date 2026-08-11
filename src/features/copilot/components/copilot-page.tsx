import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

/**
 * Shell for both copilot screens. It sits inside a viewport-height column, so
 * the header is fixed furniture and everything below it owns the remaining
 * space — that is what lets a thread scroll on its own while the composer
 * stays put at the bottom.
 */
export function CopilotPage({
  children,
  showNewChat = false,
}: {
  children: ReactNode
  showNewChat?: boolean
}) {
  return (
    <>
      <Header className='shrink-0'>
        <span className='text-sm font-medium'>Copilot</span>
        <div className='ml-auto flex items-center gap-2'>
          {showNewChat && (
            <Button variant='ghost' size='sm' asChild>
              <Link to='/copilot'>
                <PenSquare className='size-4' />
                New chat
              </Link>
            </Button>
          )}
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
    </>
  )
}
