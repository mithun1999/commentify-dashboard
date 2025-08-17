import { axiosInstance } from '@/utils/axios.util'
import {
  IOnboardingCommentPayload,
  IOnboardingPostPayload,
} from '../interface/onboarding.interface'

export async function createOnboardingPost(
  payload: IOnboardingPostPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/onboarding/post/${payload.profileId}`,
    data: payload.data,
  })
  return data
}

export async function createOnboardingComment(
  payload: IOnboardingCommentPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/onboarding/comment/${payload.profileId}`,
    data: payload.data,
  })
  return data
}
