import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { IconExclamationCircle } from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { UpdatePasswordForm } from './components/update-password-form'

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [error, setError] = useState<{
    error: string
    errorCode?: string
    errorDescription?: string
  } | null>(null)

  useEffect(() => {
    // Parse hash parameters from URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const errorParam = hashParams.get('error')
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')

    if (errorParam) {
      setError({
        error: errorParam,
        errorCode: errorCode || undefined,
        errorDescription: errorDescription || undefined,
      })
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleRequestNewLink = () => {
    navigate({ to: '/forgot-password' })
  }

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Update Password
          </CardTitle>
          <CardDescription>
            {error
              ? 'The password reset link has expired or is invalid.'
              : 'Enter your new password below to update your account password.'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <IconExclamationCircle className='h-4 w-4' />
              <AlertTitle>Link Expired or Invalid</AlertTitle>
              <AlertDescription className='space-y-2'>
                <p>
                  {error.errorDescription
                    ? decodeURIComponent(
                        error.errorDescription.replace(/\+/g, ' ')
                      )
                    : 'The password reset link has expired or is no longer valid. Please request a new password reset link.'}
                </p>
                <Button
                  variant='outline'
                  onClick={handleRequestNewLink}
                  className='w-full'
                >
                  Request New Password Reset Link
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {!error && <UpdatePasswordForm />}
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Remember your password?{' '}
            <Link
              to='/sign-in'
              className='hover:text-primary underline underline-offset-4'
            >
              Sign in
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
