import { Link } from '@tanstack/react-router'
import { IconInfoCircle, IconMessage } from '@tabler/icons-react'
import { Crisp } from 'crisp-sdk-web'
import commentifyPreview from '@/assets/images/auth-preview.svg'
import commentifyLogo from '@/assets/images/logo.svg'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { testimonialPeoples } from '@/components/layout/data/auth-page-data'
import AuthWrapper from '../auth-wrapper'
import { SignUpForm } from './components/sign-up-form'

export default function SignUp() {
  const handleTalkToFounder = () => {
    Crisp.chat.open()
  }

  return (
    <AuthWrapper>
      <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
        <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
          <div className='absolute inset-0 bg-zinc-900' />
          <div className='relative z-20 flex items-center text-lg font-medium'>
            <img src={commentifyLogo} className='relative' alt='commentify' />
          </div>

          <div className='relative z-20 m-auto'>
            <img
              src={commentifyPreview}
              className='max-w-[600px]'
              alt='Commfentify'
            />
            <div className='relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5'>
              <div className='flex -space-x-2 sm:-space-x-4'>
                {testimonialPeoples.map((item) => (
                  <div className='relative' key={item.id}>
                    <div className='relative h-7 w-7 cursor-pointer rounded-full ring-2 ring-[#0A0A0A] sm:h-9 sm:w-9'>
                      <img
                        sizes='(max-width: 768px) 32px, 40px'
                        src={item.image}
                        className='h-full w-full rounded-full object-cover transition duration-500 hover:scale-105'
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className='max-w-[250px] text-center text-xs font-medium text-white sm:max-w-[250px] sm:text-left sm:text-xs'>
                Trusted by 1000+ founder and creators. No bots. No spam. Just
                real growth.
              </p>
            </div>
          </div>

          <div className='relative z-20 mt-auto'>
            <blockquote className='space-y-2'>
              <p className='text-lg'>
                &ldquo;Clients started telling me they saw my name everywhere.
                That's when I knew commentify was doing its job
                perfectly.&rdquo;
              </p>
              <footer className='text-sm'>Ethan R., CMO at GrowthX</footer>
            </blockquote>
          </div>
        </div>
        <div className='lg:p-8'>
          <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
            <Alert className='mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'>
              <IconInfoCircle className='h-4 w-4 text-blue-600 dark:text-blue-400' />
              <AlertTitle className='text-blue-900 dark:text-blue-100'>
                Not Accepting New Users
              </AlertTitle>
              <AlertDescription className='text-blue-800 dark:text-blue-200'>
                We're currently not onboarding new users.
                <Button
                  variant='link'
                  className='h-auto gap-1 p-0 text-blue-600 dark:text-blue-400'
                  onClick={handleTalkToFounder}
                >
                  <IconMessage className='h-3 w-3' />
                  Talk to Founder
                </Button>
              </AlertDescription>
            </Alert>

            <div className='mb-5 flex flex-col space-y-2 text-left'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                Create an account
              </h1>
              <p className='text-muted-foreground text-sm'>
                Already have an account?{' '}
                <Link
                  to='/sign-in'
                  className='hover:text-primary underline underline-offset-4'
                >
                  Sign In
                </Link>
              </p>
            </div>
            <SignUpForm />
          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}
