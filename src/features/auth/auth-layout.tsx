import commentifyLogoBlack from '@/assets/images/logo-black.svg'
import commentifyLogo from '@/assets/images/logo.svg'
import AuthWrapper from './auth-wrapper'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <AuthWrapper>
      <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
          <div className='mb-6 flex items-center justify-center'>
            <img
              src={commentifyLogoBlack}
              alt='commentify'
              className='block dark:hidden'
            />
            <img
              src={commentifyLogo}
              alt='commentify'
              className='hidden dark:block'
            />
          </div>
          {children}
        </div>
      </div>
    </AuthWrapper>
  )
}
