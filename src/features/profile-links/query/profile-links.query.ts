import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  createPostMirror,
  dismissProfileLink,
  getPostMirror,
  getProfileLinks,
  linkProfiles,
  unlinkProfiles,
  updateProfileLink,
  type LinkVoice,
  type MirrorSettings,
} from '../api/profile-links.api'

export enum ProfileLinksQueryEnum {
  LINKS = 'profile-links',
  POST_MIRROR = 'post-mirror',
}

const messageOf = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback

export const useProfileLinks = (enabled = true) =>
  useQuery({
    queryKey: [ProfileLinksQueryEnum.LINKS],
    queryFn: getProfileLinks,
    enabled,
    staleTime: 60 * 1000,
  })

/**
 * Linking drafts X versions of the week's LinkedIn posts in the background,
 * so the calendars and any open post are refreshed too.
 */
const useInvalidateLinks = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [ProfileLinksQueryEnum.LINKS] })
    queryClient.invalidateQueries({
      queryKey: [ProfileLinksQueryEnum.POST_MIRROR],
    })
  }
}

export const useLinkProfiles = () => {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: linkProfiles,
    onSuccess: ({ links }) => {
      invalidate()
      const first = links[0]
      if (!first) return
      const who =
        links.length === 1 ? first.linkedin.name : `${links.length} profiles`
      toast.success(
        first.mirror.linkedinToX === 'auto-draft'
          ? `Linked. New posts from ${who} will get an X version on ${first.x.handle}.`
          : `Linked. Draft X versions on ${first.x.handle} from any LinkedIn post.`
      )
    },
    onError: (error) =>
      toast.error(messageOf(error, 'Could not link these profiles')),
  })
}

export const useUpdateProfileLink = () => {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: ({
      linkId,
      ...settings
    }: { linkId: string } & Partial<MirrorSettings> & { voice?: LinkVoice }) =>
      updateProfileLink(linkId, settings),
    onSuccess: () => {
      invalidate()
      toast.success('Saved')
    },
    onError: (error) => toast.error(messageOf(error, 'Could not save')),
  })
}

export const useUnlinkProfiles = () => {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: unlinkProfiles,
    onSuccess: () => {
      invalidate()
      toast.success('Unlinked. X versions already drafted stay as X posts.')
    },
    onError: (error) => toast.error(messageOf(error, 'Could not unlink')),
  })
}

/** "Not the same person": the pair is never suggested again. */
export const useDismissProfileLink = () => {
  const invalidate = useInvalidateLinks()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: dismissProfileLink,
    onSuccess: () => {
      invalidate()
      toast("We won't suggest these again.", {
        description: 'You can still link them from Linked profiles.',
        action: {
          label: 'Linked profiles',
          onClick: () => navigate({ to: '/linked-profiles' }),
        },
      })
    },
    onError: (error) => toast.error(messageOf(error, 'Could not save that')),
  })
}

/**
 * Polled while the X version is being written, which takes about a minute,
 * so the card turns into the draft without a refresh.
 */
export const usePostMirror = (postId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: [ProfileLinksQueryEnum.POST_MIRROR, postId],
    queryFn: () => getPostMirror(postId!),
    enabled: Boolean(postId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.role === 'source' &&
        data.targets.some((t) => t.mirror?.status === 'generating')
        ? 5000
        : false
    },
  })

export const useCreatePostMirror = (postId: string | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (xProfileId: string) => createPostMirror(postId!, xProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileLinksQueryEnum.POST_MIRROR, postId],
      })
      toast.success('Writing the X version. It takes about a minute.')
    },
    onError: (error) =>
      toast.error(messageOf(error, 'Could not draft the X version')),
  })
}
