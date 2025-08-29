import { useEffect } from 'react'
import { envConfig } from '@/config/env.config'
import { Crisp } from 'crisp-sdk-web'
import { useGetUserQuery } from '@/features/auth/query/user.query'

function useChatSupport() {
  const { data: user } = useGetUserQuery()
  const isProd = envConfig.environment === 'production'

  useEffect(() => {
    if (isProd) Crisp.configure(envConfig.crispApiKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user?.email && isProd) {
      Crisp.user.setEmail(user.email)
      Crisp.user.setNickname(user?.firstName)
    }
  }, [user, isProd])
}

export default useChatSupport
