import { ReactNode, useState } from 'react'
import { useLayoutEffect, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'

interface AuthWrapperProps {
  children: ReactNode
  // Off for pages a signed-in user must still see. A password reset link
  // signs the user in with a recovery session, so bouncing signed-in users
  // into the app would take them off the update-password page before they
  // could set the new password.
  redirectIfSignedIn?: boolean
}

const AuthWrapper = ({
  children,
  redirectIfSignedIn = true,
}: AuthWrapperProps) => {
  const isSignedIn = useAuthStore((state) => state?.session?.user?.id)
  const [shouldRender, setShouldRender] = useState(false)
  const navigate = useNavigate()

  useLayoutEffect(() => {
    if (isSignedIn && redirectIfSignedIn) {
      navigate({ to: '/' })
    } else {
      setShouldRender(true)
    }
  }, [isSignedIn, redirectIfSignedIn, navigate])

  if (!shouldRender) return <></>

  return <>{children}</>
}

export default AuthWrapper
