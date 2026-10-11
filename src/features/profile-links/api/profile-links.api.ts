import { axiosInstance } from '@/utils/axios.util'

export type MirrorMode = 'auto-draft' | 'suggest'

export const MIRROR_OFFSET_HOURS = [1, 2, 4, 6, 12, 24] as const

export interface MirrorSettings {
  /** auto-draft: every LinkedIn post gets an X version; suggest: on request. */
  linkedinToX: MirrorMode
  offsetHours: number
}

export interface LinkedProfileSummary {
  _id: string
  platform: 'linkedin' | 'twitter'
  name: string
  /** `@screenName` on X, the public identifier on LinkedIn. */
  handle: string
  postingActive: boolean
}

export interface ProfileLink {
  _id: string
  linkedin: LinkedProfileSummary
  x: LinkedProfileSummary
  mirror: MirrorSettings
}

export interface ProfileLinkSuggestion {
  linkedin: LinkedProfileSummary
  x: LinkedProfileSummary
  namesMatch: boolean
}

export interface ProfileLinks {
  links: ProfileLink[]
  suggestions: ProfileLinkSuggestion[]
  unlinked: { linkedin: LinkedProfileSummary[]; x: LinkedProfileSummary[] }
}

export interface MirrorPostSummary {
  _id: string
  calendarId: string
  profileId: string
  status: string
  content: string
  outputType?: string
  scheduledAt?: string
  publishedUrl?: string
}

/** A LinkedIn post's X version and link, or an X version's LinkedIn post. */
export type PostMirror =
  | {
      role: 'source'
      link: { _id: string; x: LinkedProfileSummary; mirror: MirrorSettings } | null
      mirror: MirrorPostSummary | null
      canLink: boolean
    }
  | { role: 'mirror'; source: MirrorPostSummary | null }
  | { role: 'none' }

export async function getProfileLinks(): Promise<ProfileLinks> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/post-generator/profile-links',
  })
  return data
}

export async function linkProfiles(payload: {
  linkedinProfileId: string
  xProfileId: string
  linkedinToX?: MirrorMode
  offsetHours?: number
}): Promise<ProfileLink> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/profile-links',
    data: payload,
  })
  return data
}

export async function updateProfileLink(
  linkId: string,
  payload: Partial<MirrorSettings>
): Promise<ProfileLink> {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/profile-links/${linkId}`,
    data: payload,
  })
  return data
}

export async function unlinkProfiles(linkId: string) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/post-generator/profile-links/${linkId}`,
  })
  return data
}

export async function dismissProfileLink(payload: {
  linkedinProfileId: string
  xProfileId: string
}) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/profile-links/dismiss',
    data: payload,
  })
  return data
}

export async function getPostMirror(postId: string): Promise<PostMirror> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/posts/${postId}/mirror`,
  })
  return data
}

export async function createPostMirror(
  postId: string
): Promise<{ mirror: MirrorPostSummary | null }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/mirror`,
  })
  return data
}
