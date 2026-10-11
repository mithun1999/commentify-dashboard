import { useSearch } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LibraryBrowser } from './components/library-browser'

/**
 * The owner's content library: everything saved, across every profile.
 * Each profile's posting agent has a Library tab with the same notes, for
 * what that profile may use.
 */
export default function LibraryPage() {
  const { note } = useSearch({ strict: false }) as { note?: string }
  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='mx-auto max-w-3xl'>
          <div className='mb-6'>
            <h1 className='text-2xl font-bold tracking-tight'>Knowledge Hub</h1>
            <p className='text-muted-foreground max-w-xl text-sm'>
              Material your posts can be built on: articles, case studies,
              decks, notes. The planner sees a one-line card for each and
              uses one only when it fits; nothing here is posted as is.
            </p>
          </div>
          <LibraryBrowser initialNoteId={note} />
        </div>
      </Main>
    </>
  )
}
