import { axiosInstance } from '@/utils/axios.util'

export type NoteSourceType = 'url' | 'file' | 'paste' | 'research'
export type NoteStatus = 'processing' | 'ready' | 'failed'

export interface LibraryNote {
  _id: string
  source: {
    type: NoteSourceType
    url?: string
    fileName?: string
    /** An original file is stored and can be downloaded. */
    hasOriginal: boolean
  }
  title: string
  gist: string
  topics: string[]
  entities: string[]
  claimCount: number
  chunkCount: number
  chars: number
  truncated: boolean
  /**
   * The owner's own material (their site, company or writing): posts say it
   * as theirs. Otherwise posts credit it.
   */
  mine: boolean
  visibility: 'owner' | 'private'
  profileIds: string[]
  pinnedProfileIds: string[]
  excludedProfileIds: string[]
  status: NoteStatus
  error?: string
  addedFromProfileId?: string
  createdAt: string
  updatedAt: string
  /** In a profile's list: a post of that profile drew on it lately. */
  usedByProfile?: boolean
}

export interface LibraryClaim {
  id: string
  text: string
  evidence: string
  chunkIndex: number
  kind: 'stat' | 'fact' | 'quote' | 'claim' | 'step' | 'definition'
  url?: string
}

export interface LibraryNoteDetail extends LibraryNote {
  claims: LibraryClaim[]
  usedBy: Array<{
    postId: string
    calendarId: string
    profileId: string
    platform: 'linkedin' | 'twitter'
    status: string
    scheduledAt?: string
    topic?: string
  }>
}

export interface LibraryList {
  items: LibraryNote[]
  total: number
  page: number
  limit: number
  /** Notes the owner added, against the plan's limit (research notes don't count). */
  count: number
  noteLimit: number
}

export interface LibraryFilters {
  q?: string
  topic?: string
  type?: NoteSourceType
  status?: NoteStatus
  profileId?: string
  page?: number
  limit?: number
}

export async function listNotes(filters: LibraryFilters): Promise<LibraryList> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/library/notes',
    params: filters,
  })
  return data
}

export async function getNote(id: string): Promise<LibraryNoteDetail> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/library/notes/${id}`,
  })
  return data
}

/** A link, pasted text or a file; one of the three. */
export async function createNote(input: {
  url?: string
  text?: string
  file?: File
  title?: string
  profileId?: string
  /** Set when the author said whose it is. */
  mine?: boolean
}): Promise<LibraryNote> {
  if (input.file) {
    const form = new FormData()
    form.append('file', input.file)
    if (input.title) form.append('title', input.title)
    if (input.profileId) form.append('profileId', input.profileId)
    if (input.mine !== undefined) form.append('mine', String(input.mine))
    const { data } = await axiosInstance({
      method: 'POST',
      url: '/library/notes',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/library/notes',
    data: input,
  })
  return data
}

export async function updateNote(
  id: string,
  changes: Partial<{
    title: string
    gist: string
    topics: string[]
    claims: Array<{ id: string; text: string }>
    visibility: 'owner' | 'private'
    profileIds: string[]
    mine: boolean
  }>
): Promise<LibraryNote> {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/library/notes/${id}`,
    data: changes,
  })
  return data
}

export async function deleteNote(id: string) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/library/notes/${id}`,
  })
  return data
}

export async function retryNote(id: string): Promise<LibraryNote> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/library/notes/${id}/retry`,
  })
  return data
}

export async function noteDownloadUrl(id: string): Promise<{ url: string }> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/library/notes/${id}/download`,
  })
  return data
}

export async function setNoteForProfile(
  id: string,
  profileId: string,
  state: 'pinned' | 'excluded' | 'default'
): Promise<LibraryNote> {
  const { data } = await axiosInstance({
    method: 'PUT',
    url: `/library/notes/${id}/profiles/${profileId}`,
    data: { state },
  })
  return data
}

/** "Use for…": a draft on a profile, built on this note. */
export async function draftFromNote(
  noteId: string,
  profileId: string,
  /** What to do with the note: "focus on onboarding, keep it short". */
  instruction?: string
): Promise<{ calendar: { _id: string }; post: { _id: string } }> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/post-generator/library/notes/${noteId}/draft`,
    data: {
      profileId,
      ...(instruction?.trim() ? { instruction: instruction.trim() } : {}),
    },
  })
  return data
}
