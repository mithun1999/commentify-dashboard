import { axiosInstance } from '@/utils/axios.util'
import {
  IOnboardingCommentPayload,
  IOnboardingPostPayload,
  IOnboardingTwitterPostPayload,
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

export async function createOnboardingTwitterPostSetting(
  payload: IOnboardingTwitterPostPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/twitter-scrape/${payload.profileId}`,
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

export interface IAnalyzeProfileResult {
  aboutProfile: string
  keywords: string[]
  headline: string
}

export async function analyzeOnboardingProfile(payload: {
  profileId: string
  mode: 'branding' | 'sales'
}): Promise<IAnalyzeProfileResult> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/onboarding/analyze-profile/${payload.profileId}`,
    data: { mode: payload.mode },
  })
  return data
}

interface TaskStatus<T> {
  id: string
  state: string
  result: T | null
  failedReason?: string
}

/**
 * Polls a queued task until it completes, then resolves with its result. Keeps
 * the async queue transparent to callers so query hooks/components are unchanged.
 */
async function pollTaskResult<T>(
  taskId: string,
  { intervalMs = 2000, timeoutMs = 150000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const { data } = await axiosInstance<TaskStatus<T>>({
      method: 'GET',
      url: `/task/${taskId}`,
    })
    if (data.state === 'completed' && data.result != null) return data.result
    if (data.state === 'failed') {
      throw new Error(data.failedReason || 'Task failed')
    }
    if (Date.now() > deadline) throw new Error('Task timed out')
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export async function validateOnboardingKeywords(payload: {
  keywords: string[]
  profileId?: string
}): Promise<{ valid: string[]; invalid: string[] }> {
  const { data } = await axiosInstance<{ taskId: string }>({
    method: 'POST',
    url: '/setting/onboarding/validate-keywords',
    data: { keywords: payload.keywords, profileId: payload.profileId },
  })
  return pollTaskResult(data.taskId)
}

export async function refineOnboardingKeywords(payload: {
  profileId: string
  existing: string[]
  mode: 'branding' | 'sales'
}): Promise<{ keywords: string[]; invalid: string[] }> {
  const { data } = await axiosInstance<{ taskId: string }>({
    method: 'POST',
    url: '/setting/onboarding/refine-keywords',
    data: {
      profileId: payload.profileId,
      existing: payload.existing,
      mode: payload.mode,
    },
  })
  return pollTaskResult(data.taskId)
}
