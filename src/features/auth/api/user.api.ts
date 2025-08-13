import { axiosInstance } from '@/utils/axios.util'
import { IUser } from '../interface/user.interface'

export async function getUser() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/user/me`,
  })
  return data as IUser
}

export async function updateOnboardingStatus(data: {
  onboarding_status: 'completed' | 'in_progress' | 'not_started'
}) {
  const { data: response } = await axiosInstance({
    method: 'PATCH',
    url: `/user/onboarding`,
    data,
  })
  return response
}
