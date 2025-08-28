import { axiosInstance } from '@/utils/axios.util'
import {
  ICommentSettingPayload,
  IScrapeSettingPayload,
} from '../interface/setting.interface'

export async function createScrapeSetting(
  payload: IScrapeSettingPayload & {
    userPlan?: 'starter' | 'pro' | 'premium'
    profileId: string
  }
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/scrape/${payload?.userPlan}/${payload?.profileId}`,
    data: payload,
  })
  return data
}

export async function updateScrapeSetting(
  payload: IScrapeSettingPayload & {
    userPlan?: 'starter' | 'pro' | 'premium'
    profileId: string
  }
) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/setting/scrape/${payload?.userPlan}/${payload?.profileId}`,
    data: payload,
  })
  return data
}

export async function updateCommentSetting(
  payload: ICommentSettingPayload & {
    userPlan?: 'starter' | 'pro' | 'premium'
    profileId: string
  }
) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/setting/comment/${payload?.userPlan}/${payload?.profileId}`,
    data: payload,
  })
  return data
}

export async function createCommentSetting(
  payload: ICommentSettingPayload & {
    userPlan?: 'starter' | 'pro' | 'premium'
    profileId: string
  }
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/comment/${payload?.userPlan}/${payload?.profileId}`,
    data: payload,
  })
  return data
}
