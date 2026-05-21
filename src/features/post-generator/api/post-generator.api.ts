import { axiosInstance } from '@/utils/axios.util'

export async function generateCalendar(profileId: string, weekOffset: number = 0) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/calendar/generate',
    data: { profileId, weekOffset },
  })
  return data
}

export async function getCurrentCalendar(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/calendar/current/${profileId}`,
  })
  return data
}

export async function getActiveCalendars(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/calendar/active/${profileId}`,
  })
  return data as Array<{ calendar: any; posts: any[] }>
}

export async function getCalendar(calendarId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/calendar/${calendarId}`,
  })
  return data
}

export async function approvePost(calendarId: string, postId: string) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/approve`,
  })
  return data
}

export async function editPost(calendarId: string, postId: string, content: string) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/edit`,
    data: { content },
  })
  return data
}

export async function rejectPost(calendarId: string, postId: string, reason: string, profileId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/reject`,
    data: { reason, profileId },
  })
  return data
}

export async function chatEditPost(calendarId: string, postId: string, message: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/chat`,
    data: { message },
  })
  return data as {
    content: string
    assistantMessage: string
    editHistory: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: string
      postSnapshot?: string
    }>
  }
}

export async function publishPost(calendarId: string, postId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/publish`,
  })
  return data
}

export async function scheduleAll(calendarId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/calendar/${calendarId}/schedule-all`,
  })
  return data
}

export async function getCalendarHistory(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/calendar/history/${profileId}`,
  })
  return data
}

export interface CreateManualPostPayload {
  profileId: string
  idea: string
  scheduledAt: string
  topic?: string
  pillar?: string
}

export async function createManualPost(payload: CreateManualPostPayload) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/posts/manual',
    data: payload,
  })
  return data as { calendar: any; post: any }
}

export interface PostingPreferences {
  postsPerWeek: number
  preferredDays: string[]
  preferredTime: string
  aiSuggested?: {
    postsPerWeek: number
    preferredDays: string[]
    preferredTime: string
  }
}

export async function getPostingPreferences(profileId: string): Promise<PostingPreferences> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/preferences/${profileId}`,
  })
  return data
}

export async function updatePostingPreferences(
  profileId: string,
  prefs: Partial<PostingPreferences>,
): Promise<PostingPreferences> {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/preferences/${profileId}`,
    data: prefs,
  })
  return data
}

export async function startOnboarding(profileId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/onboarding/start',
    data: { profileId },
  })
  return data
}

export async function getOnboardingStatus(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/onboarding/status/${profileId}`,
  })
  return data
}

export async function completeOnboarding(profileId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/onboarding/complete',
    data: { profileId },
  })
  return data
}

export async function addCreator(profileId: string, linkedinUrl: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/creator/add',
    data: { profileId, linkedinUrl },
  })
  return data
}

export async function listCreators(profileId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/creator/list/${profileId}`,
  })
  return data
}

export async function deleteCreator(creatorId: string) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/post-generator/creator/${creatorId}`,
  })
  return data
}

export async function updateAgentTypes(profileId: string, payload: { add?: string; remove?: string }) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/profile/${profileId}/agent-types`,
    data: payload,
  })
  return data
}

export function getCalendarStreamUrl(calendarId: string): string {
  const base = axiosInstance.defaults.baseURL || ''
  return `${base}/post-generator/calendar/stream/${calendarId}`
}
