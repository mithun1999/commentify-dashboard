import logoBlack from '@/assets/images/logo-black.svg'
import logoWhite from '@/assets/images/logo.svg'
import { ThemeSwitch } from '@/components/theme-switch'

export function OnboardingHeader() {
  return (
    <header className='sticky top-0 z-40 backdrop-blur-md'>
      <div className='container flex h-16 items-center justify-between'>
        <div className='flex items-center gap-2'>
          <img src={logoBlack} alt='commentify' className='block dark:hidden' />
          <img src={logoWhite} alt='commentify' className='hidden dark:block' />
        </div>
        <div className='flex items-center gap-4'>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
