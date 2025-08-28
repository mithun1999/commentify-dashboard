import { axiosInstance } from '@/utils/axios.util'
import {
  IOnboardingCommentPayload,
  IOnboardingPostPayload,
} from '../interface/onboarding.interface'

export async function createOnboardingPostSetting(
  payload: IOnboardingPostPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/onboarding/post/${payload.profileId}`,
    data: payload.data,
  })
  return data
}

export async function createOnboardingCommentSetting(
  payload: IOnboardingCommentPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/onboarding/comment/${payload.profileId}`,
    data: payload.data,
  })
  return data
}
