import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  approvePosts,
  deletePostComments,
  editPostComment,
  getCompletedPosts,
  getPendingPosts,
} from '@/features/history/api/post.api'
import type { IPost } from '@/features/history/interface/post.interface'

enum AgentPostQueryEnum {
  GET_PENDING = 'agent-pending-posts',
  GET_COMPLETED = 'agent-completed-posts',
}

export function useAgentPendingPosts(
  profileId: string | undefined,
  page: number,
  limit: number
) {
  return useQuery({
    queryKey: [AgentPostQueryEnum.GET_PENDING, profileId, page, limit],
    enabled: Boolean(profileId),
    queryFn: async () => {
      if (!profileId) return null
      return getPendingPosts(profileId, page, limit)
    },
    placeholderData: (prev) => prev ?? null,
  })
}

export function useAgentCompletedPosts(
  profileId: string | undefined,
  page: number,
  limit: number
) {
  return useQuery({
    queryKey: [AgentPostQueryEnum.GET_COMPLETED, profileId, page, limit],
    enabled: Boolean(profileId),
    queryFn: async () => {
      if (!profileId) return null
      return getCompletedPosts(profileId, page, limit)
    },
    placeholderData: (prev) => prev ?? null,
    retry: 1,
  })
}

export function useAgentUpdateComment(
  profileId: string | undefined,
  page: number,
  limit: number,
  onSuccess?: (activityUrn: string) => void
) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: editPostComment,
    onSuccess: (data: IPost) => {
      onSuccess?.(data?.activityUrn)
      if (profileId) {
        queryClient.invalidateQueries({
          queryKey: [AgentPostQueryEnum.GET_PENDING, profileId, page, limit],
          exact: true,
          refetchType: 'active',
        })
      }
      toast.success('Comment updated successfully')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while editing comment'
      )
    },
  })
  return { updateComment: mutate, isUpdatingComment: isPending }
}

export function useAgentApprovePosts(
  profileId: string | undefined,
  page: number,
  limit: number,
  onSuccess?: () => void
) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: approvePosts,
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data?.success) {
        if (profileId) {
          queryClient.invalidateQueries({
            queryKey: [AgentPostQueryEnum.GET_PENDING, profileId, page, limit],
            exact: true,
            refetchType: 'active',
          })
        }
        onSuccess?.()
        toast.success(data?.message)
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while approving posts'
      )
    },
  })
  return { approvePosts: mutate, isApprovingPosts: isPending }
}

export function useAgentDeletePosts(
  profileId: string | undefined,
  page: number,
  limit: number,
  onSuccess?: () => void
) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: deletePostComments,
    onSuccess: () => {
      if (profileId) {
        queryClient.invalidateQueries({
          queryKey: [AgentPostQueryEnum.GET_PENDING, profileId, page, limit],
          exact: true,
          refetchType: 'active',
        })
      }
      onSuccess?.()
      toast.success('Deleted successfully')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while deleting'
      )
    },
  })
  return { deletePostComments: mutate, isDeletingPostComments: isPending }
}
