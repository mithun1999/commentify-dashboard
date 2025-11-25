import { axiosInstance } from '@/utils/axios.util'
import { IUser } from '../interface/user.interface'

export async function getUser() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/user/me`,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  return data as IUser
}

export async function updateOnboardingStatus(data: {
  status: 'not-started' | 'in-progress' | 'completed'
  step: number
  heardFrom?: string
}) {
  const { data: response } = await axiosInstance({
    method: 'PATCH',
    url: `/user/onboarding`,
    data,
  })
  return response
}
