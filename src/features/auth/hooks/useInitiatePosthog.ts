import { useEffect } from 'react'
import { posthog } from 'posthog-js'
import { useGetUserQuery } from '@/features/auth/query/user.query'

function useInitiatePosthog() {
  const { data: user } = useGetUserQuery()

  useEffect(() => {
    if (user?.email) {
      const { _id, email, firstName, lastName } = user
      posthog.identify(_id.toString(), {
        email,
        name: `${firstName} ${lastName}`,
      })
    }
  }, [user])
}

export default useInitiatePosthog


