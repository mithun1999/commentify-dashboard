import { axiosInstance } from '@/utils/axios.util'

export interface CalendarUserContextInput {
  thisWeekEvents?: string
  nextWeekThemes?: string
  specificStories?: string
  avoidTopics?: string
}

export async function generateCalendar(
  profileId: string,
  weekOffset: number = 0,
  userContext?: CalendarUserContextInput,
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/calendar/generate',
    data: { profileId, weekOffset, userContext },
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

export async function unapprovePost(calendarId: string, postId: string) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/calendar/${calendarId}/post/${postId}/unapprove`,
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
    action?:
      | 'edit_text'
      | 'convert_to_carousel'
      | 'regenerate_image'
      | 'unsupported'
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

export async function convertPostToCarousel(postId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/convert-to-carousel`,
  })
  return data as { status: 'queued'; message: string }
}

export async function chatUpdateVoice(profileId: string, message: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/post-generator/voice/chat',
    data: { profileId, message },
  })
  return data as {
    assistantMessage: string
    needsClarification: boolean
    updated: boolean
    voiceSignature: any
    voiceEditHistory: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: string
      appliedPatch?: Record<string, any>
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

export interface PostMedia {
  _id: string
  type: 'image' | 'pdf'
  blobName: string
  url: string
  mimeType: string
  originalFilename: string
  size: number
  source?: 'ai' | 'user'
  aiKind?: 'chat_screenshot' | 'dashboard_screenshot' | 'carousel_slide' | 'carousel_pdf'
  slideIndex?: number
  createdAt?: string
}

export interface CarouselSlideState {
  index: number
  title: string
  body?: string
  accent?: string
  prompt: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  blobName?: string
  url?: string
  size?: number
  error?: string
  updatedAt?: string
}

export interface CarouselPayload {
  styleKey: CarouselStyleKey
  narrativeContext?: string
  slides: CarouselSlideState[]
  pdf?: { blobName?: string; url?: string; size?: number; assembledAt?: string }
  status: 'generating' | 'assembling' | 'ready' | 'failed'
  error?: string
}

export interface PostImageFit {
  type: string
  confidence?: number
  reasoning?: string
  generatedAt?: string
  error?: string | null
  carousel?: CarouselPayload
}

export interface RegenerateAiImageResponse {
  status: 'queued'
  jobId: string
  mediaId: string
  message: string
}

export async function regenerateAiImage(
  postId: string,
  mediaId: string,
  instruction: string,
): Promise<RegenerateAiImageResponse> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/media/${mediaId}/regenerate-ai`,
    data: { instruction },
  })
  return data
}

export async function uploadPostMedia(postId: string, files: File[]): Promise<{ media: PostMedia[] }> {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/media`,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deletePostMedia(postId: string, mediaId: string): Promise<{ media: PostMedia[] }> {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/post-generator/posts/${postId}/media/${mediaId}`,
  })
  return data
}

export interface FormatSuggestion {
  suggestion: 'image' | 'pdf' | 'none'
  reason: string
  imagePrompt?: string
  pdfOutline?: string[]
}

export async function getFormatSuggestions(postId: string, commentary: string): Promise<FormatSuggestion> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/format-suggestions`,
    data: { commentary },
  })
  return data
}

export type CarouselStyleKey =
  | 'gradient_modern'
  | 'editorial_quote'
  | 'hand_drawn'
  | 'tabloid_breaking'
  | 'minimalist_blue'
  | 'vintage_print'

export type BrandBackgroundMode = 'cream' | 'white' | 'dark'

export interface BrandSettings {
  _id?: string
  profileId: string
  ownerId: string
  colors: {
    primary: string
    accent: string
    background: BrandBackgroundMode
  }
  lockedStyles: CarouselStyleKey[]
  autoDerived: boolean
  derivedFrom?: {
    sourceSummary?: string
    creatorSampleIds?: string[]
    derivedAt?: string
  }
  lastRotationIndex?: number
  createdAt?: string
  updatedAt?: string
}

export async function getBrandSettings(profileId: string): Promise<BrandSettings> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post-generator/brand-settings/${profileId}`,
  })
  return data
}

export async function updateBrandSettings(
  profileId: string,
  patch: {
    colors?: Partial<BrandSettings['colors']>
    lockedStyles?: CarouselStyleKey[]
  },
): Promise<BrandSettings> {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/post-generator/brand-settings/${profileId}`,
    data: patch,
  })
  return data
}

export async function rederiveBrandSettings(profileId: string): Promise<BrandSettings> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/brand-settings/${profileId}/rederive`,
  })
  return data
}

export interface CarouselSlideJobResponse {
  status: 'queued'
  jobId?: string
  slideIndex?: number
  slideCount?: number
  styleKey?: CarouselStyleKey
  message: string
}

export async function editCarouselSlide(
  postId: string,
  slideIndex: number,
  instruction: string,
): Promise<CarouselSlideJobResponse> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/carousel/slides/${slideIndex}/edit`,
    data: { instruction },
  })
  return data
}

export async function regenerateCarouselSlide(
  postId: string,
  slideIndex: number,
  overrides: { title?: string; body?: string; accent?: string } = {},
): Promise<CarouselSlideJobResponse> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/carousel/slides/${slideIndex}/regenerate`,
    data: overrides,
  })
  return data
}

export async function switchCarouselTemplate(
  postId: string,
  styleKey: CarouselStyleKey,
): Promise<CarouselSlideJobResponse> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/posts/${postId}/carousel/switch-template`,
    data: { styleKey },
  })
  return data
}
