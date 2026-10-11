import { axiosInstance } from '@/utils/axios.util'

export type MirrorMode = 'auto-draft' | 'suggest'

/**
 * Whose X account it is: `person`, the LinkedIn author's own (written as
 * them); `team`, a company or brand account (written as the account).
 */
export type LinkVoice = 'person' | 'team'

export const MIRROR_OFFSET_HOURS = [1, 2, 4, 6, 12, 24] as const

/** Each direction on its own: automatic, or on request. One delay for both. */
export interface MirrorSettings {
  linkedinToX: MirrorMode
  xToLinkedin: MirrorMode
  offsetHours: number
}

export interface LinkedProfileSummary {
  _id: string
  platform: 'linkedin' | 'twitter'
  name: string
  /** `@screenName` on X, the public identifier on LinkedIn. */
  handle: string
  postingActive: boolean
  /** X accounts: whether their own posts read as a person or a company. */
  speaksAs?: LinkVoice | null
}

/** A LinkedIn profile and an X account whose posts are shared both ways. */
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
  platform: 'linkedin' | 'twitter'
  status: string
  content: string
  outputType?: string
  scheduledAt?: string
  publishedUrl?: string
}

/** A post's linked profiles on the other network, or a version's original. */
export type PostMirror =
  | {
      role: 'source'
      /** The post's own network. */
      platform: 'linkedin' | 'twitter'
      targets: Array<{ link: ProfileLink; mirror: MirrorPostSummary | null }>
      /** Some profile on the other network isn't linked to this one yet. */
      canLinkMore: boolean
    }
  | {
      role: 'mirror'
      source: MirrorPostSummary | null
      /** Whose post the original is. */
      from: LinkedProfileSummary | null
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
  xProfileIds: string[]
  /** Left out, the backend works it out per pair. */
  voice?: LinkVoice
  linkedinToX: MirrorMode
  xToLinkedin: MirrorMode
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
  targetProfileId: string
): Promise<{ mirror: MirrorPostSummary | null }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/mirror`,
    data: { targetProfileId },
  })
  return data
}
