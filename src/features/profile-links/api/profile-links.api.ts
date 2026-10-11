import { axiosInstance } from '@/utils/axios.util'

export type MirrorMode = 'auto-draft' | 'suggest'

/**
 * Whose X account it is: `person`, the LinkedIn author's own (written as
 * them); `team`, a company or brand account (written as the account).
 */
export type LinkVoice = 'person' | 'team'

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

/** One LinkedIn profile feeding one X account. */
export interface ProfileLink {
  _id: string
  linkedin: LinkedProfileSummary
  x: LinkedProfileSummary
  voice: LinkVoice
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
  profiles: { linkedin: LinkedProfileSummary[]; x: LinkedProfileSummary[] }
  /** Profiles in no link at all. */
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

/** A LinkedIn post's X accounts and versions, or an X version's LinkedIn post. */
export type PostMirror =
  | {
      role: 'source'
      targets: Array<{ link: ProfileLink; mirror: MirrorPostSummary | null }>
      /** Some X account isn't linked to this LinkedIn profile yet. */
      canLinkMore: boolean
    }
  | {
      role: 'mirror'
      source: MirrorPostSummary | null
      author: LinkedProfileSummary | null
      voice: LinkVoice
    }
  | { role: 'none' }

export async function getProfileLinks(): Promise<ProfileLinks> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/post-generator/profile-links',
  })
  return data
}

export async function linkProfiles(payload: {
  linkedinProfileIds: string[]
  xProfileId: string
  voice: LinkVoice
  linkedinToX: MirrorMode
  offsetHours: number
}): Promise<{ links: ProfileLink[] }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/profile-links',
    data: payload,
  })
  return data
}

export async function updateProfileLink(
  linkId: string,
  payload: Partial<MirrorSettings> & { voice?: LinkVoice }
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
  postId: string,
  xProfileId: string
): Promise<{ mirror: MirrorPostSummary | null }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/mirror`,
    data: { xProfileId },
  })
  return data
}
