import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { envConfig } from '@/config/env.config'
import { checkIsExtensionInstalled } from '@/lib/utils'
import { useOnboarding } from '@/stores/onboarding.store'
import { useUpdateOnboardingStatus } from '@/features/auth/query/user.query'

export function useExtensionGuard() {
  const navigate = useNavigate()
  const { updateData, removeCompletedStep } = useOnboarding()
  const { updateOnboardingStatusAsync } = useUpdateOnboardingStatus()
  const [isChecking, setIsChecking] = useState(true)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true

    async function check() {
      try {
        const installed = await checkIsExtensionInstalled(
          envConfig.chromeExtensionId,
          envConfig.chromeExtensionIconUrl
        )

        if (!installed) {
          updateData({ isExtensionInstalled: false })
          removeCompletedStep('extension')
          await updateOnboardingStatusAsync({
            status: 'in-progress',
            step: 0,
          })
          navigate({ to: '/onboarding/extension', replace: true })
          return
        }
      } catch {
        // If check fails, don't block the user
      } finally {
        setIsChecking(false)
      }
    }

    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isChecking }
}
