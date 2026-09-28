import { axiosInstance } from '@/utils/axios.util'
import type { ITwitterProfileFromExtension } from '@/features/twitter-commenting/utils/extension'
import {
  IDisconnectProfileResponse,
  ILinkProfilePayload,
  ILinkProfileResponse,
  ILinkedInStats,
  IProfile,
} from '../interface/profile.interface'

export async function getAllProfile() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/profile`,
  })
  return data as IProfile[]
}

/**
 * Revokes the account's connection: credentials are wiped and every agent on
 * it stops. Drafts, history and billing are untouched. Safe to repeat.
 */
export async function disconnectProfile(profileId: string) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/profile/${profileId}`,
  })
  return data as IDisconnectProfileResponse
}

export async function pauseAgent(profileId: string, agentType: string) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/profile/${profileId}/agents/${agentType}/pause`,
  })
  return data as { success: boolean }
}

export async function resumeAgent(profileId: string, agentType: string) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/profile/${profileId}/agents/${agentType}/resume`,
  })
  return data as { success: boolean }
}

export async function linkProfile(payload: ILinkProfilePayload) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/profile/link`,
    data: payload,
  })
  return data as ILinkProfileResponse
}

export type ILinkTwitterProfilePayload = ITwitterProfileFromExtension & {
  reconnect?: boolean
}

export async function linkTwitterProfile(payload: ILinkTwitterProfilePayload) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/profile/link`,
    data: payload,
  })
  return data as ILinkProfileResponse
}

export async function getLinkedInStats(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/li-stats/${profileId}`,
  })
  return data as ILinkedInStats
}

export async function getPostStats(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post/stats/${profileId}`,
  })
  return data as { pending: number; scheduled: number; completed: number }
}

export async function getPostingStats(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/stats/${profileId}`,
  })
  return data as { published: number; scheduled: number; draft: number }
}
