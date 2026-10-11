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

/** A link changes what the post editor shows, so open posts refresh too. */
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
      const { linkedinToX, xToLinkedin } = first.mirror
      const what =
        links.length === 1
          ? `${first.linkedin.name} and ${first.x.handle}`
          : `${links.length} pairs`
      toast.success(
        linkedinToX === 'auto-draft' && xToLinkedin === 'auto-draft'
          ? `Linked ${what}. New posts on either side get a version on the other.`
          : linkedinToX === 'auto-draft'
            ? `Linked ${what}. New LinkedIn posts get an X version.`
            : xToLinkedin === 'auto-draft'
              ? `Linked ${what}. New X posts get a LinkedIn version.`
              : `Linked ${what}. Draft versions from any post.`
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
      toast.success('Unlinked. Versions already drafted stay as ordinary posts.')
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
 * Polled while a version is being written, which takes about a minute,
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
    mutationFn: (targetProfileId: string) =>
      createPostMirror(postId!, targetProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileLinksQueryEnum.POST_MIRROR, postId],
      })
      toast.success('Writing it now. It takes about a minute.')
    },
    onError: (error) =>
      toast.error(messageOf(error, 'Could not draft the version')),
  })
}
