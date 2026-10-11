import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createNote,
  deleteNote,
  draftFromNote,
  getNote,
  listNotes,
  retryNote,
  setNoteForProfile,
  updateNote,
  type LibraryFilters,
} from '../api/library.api'

export enum LibraryQueryEnum {
  NOTES = 'library-notes',
  NOTE = 'library-note',
}

const messageOf = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback

/** Polled while any note on the page is still being read. */
export const useLibraryNotes = (filters: LibraryFilters, enabled = true) =>
  useQuery({
    queryKey: [LibraryQueryEnum.NOTES, filters],
    queryFn: () => listNotes(filters),
    enabled,
    placeholderData: (prev) => prev,
    refetchInterval: (query) =>
      query.state.data?.items.some((n) => n.status === 'processing') ? 4000 : false,
  })

export const useLibraryNote = (id: string | undefined) =>
  useQuery({
    queryKey: [LibraryQueryEnum.NOTE, id],
    queryFn: () => getNote(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 4000 : false),
  })

const useInvalidate = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [LibraryQueryEnum.NOTES] })
    queryClient.invalidateQueries({ queryKey: [LibraryQueryEnum.NOTE] })
  }
}

export const useCreateNote = () => {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      invalidate()
      toast.success('Added. Reading it now; it takes about a minute.')
    },
    onError: (error) => toast.error(messageOf(error, 'Could not add that')),
  })
}

export const useUpdateNote = () => {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Parameters<typeof updateNote>[1]) =>
      updateNote(id, changes),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error, 'Could not save')),
  })
}

export const useDeleteNote = () => {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      invalidate()
      toast.success('Deleted')
    },
    onError: (error) => toast.error(messageOf(error, 'Could not delete')),
  })
}

export const useRetryNote = () => {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: retryNote,
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error, 'Could not retry')),
  })
}

export const useSetNoteForProfile = () => {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({
      id,
      profileId,
      state,
    }: {
      id: string
      profileId: string
      state: 'pinned' | 'excluded' | 'default'
    }) => setNoteForProfile(id, profileId, state),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error, 'Could not save')),
  })
}

export const useDraftFromNote = () =>
  useMutation({
    mutationFn: ({ noteId, profileId }: { noteId: string; profileId: string }) =>
      draftFromNote(noteId, profileId),
    onError: (error) => toast.error(messageOf(error, 'Could not start the draft')),
  })
