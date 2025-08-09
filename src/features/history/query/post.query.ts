import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// Stop using a separate QueryClient instance; use the provider's client via useQueryClient
import { toast } from 'react-toastify'
import { useProfileStore } from '@/stores/profile.store'
import { useHistoryStore } from '@/features/history/store/history.store'
import {
  approvePosts,
  deletePostComments,
  editPostComment,
  getCompletedPosts,
  getPendingPosts,
} from '../api/post.api'
import { IPost } from '../interface/post.interface'

export enum PostQueryEnum {
  GET_COMPLETED_POSTS = 'get-completed-posts',
  GET_PENDING_POSTS = 'get-pending-posts',
}

export const useGetCompletedPostsQuery = (page: number, limit: number) => {
  const activeProfileId = useProfileStore((s) => s.activeProfile?._id)
  const { isPending, isError, error, data, isFetching } = useQuery({
    queryKey: [PostQueryEnum.GET_COMPLETED_POSTS, activeProfileId, page, limit],
    enabled: Boolean(activeProfileId),
    queryFn: async () => {
      if (!activeProfileId) return null
      const data = await getCompletedPosts(activeProfileId, page, limit)
      return data
    },
    placeholderData: (prev) => prev ?? null,
    retry: 1,
  })

  return { isPending, isError, error, data, isFetching }
}

export const useGetPendingPostsQuery = (page: number, limit: number) => {
  const activeProfileId = useProfileStore((s) => s.activeProfile?._id)
  const { isPending, isError, error, data, isFetching } = useQuery({
    queryKey: [PostQueryEnum.GET_PENDING_POSTS, activeProfileId, page, limit],
    enabled: Boolean(activeProfileId),
    queryFn: async () => {
      if (!activeProfileId) return null
      const data = await getPendingPosts(activeProfileId, page, limit)
      return data
    },
    placeholderData: (prev) => prev ?? null,
  })

  return {
    isPending,
    isError,
    error,
    data,
    isFetching,
  }
}

export const useUpdatePostComment = (cb: (data: string) => void) => {
  const activeProfileId = useProfileStore((s) => s.activeProfile?._id)
  const pageIndex = useHistoryStore((s) => s.pageIndex)
  const pageSize = useHistoryStore((s) => s.pageSize)
  const page = pageIndex + 1
  const limit = pageSize
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: editPostComment,
    onSuccess: (data: IPost) => {
      cb(data?.activityUrn)
      // Invalidate only the exact key for the current page & limit
      if (activeProfileId && page && limit) {
        queryClient.invalidateQueries({
          queryKey: [
            PostQueryEnum.GET_PENDING_POSTS,
            activeProfileId,
            page,
            limit,
          ],
          exact: true,
          refetchType: 'active',
        })
      }
      toast('Comment updated successfully', {
        type: 'success',
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while editing comment',
        {
          type: 'error',
        }
      )
    },
  })

  return { updateComment: mutate, isUpdatingComment: isPending }
}

export const useApprovePosts = (successCb: () => void) => {
  const activeProfileId = useProfileStore((s) => s.activeProfile?._id)
  const pageIndex = useHistoryStore((s) => s.pageIndex)
  const pageSize = useHistoryStore((s) => s.pageSize)
  const page = pageIndex + 1
  const limit = pageSize
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: approvePosts,
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data?.success) {
        if (activeProfileId) {
          queryClient.invalidateQueries({
            queryKey: [
              PostQueryEnum.GET_PENDING_POSTS,
              activeProfileId,
              page,
              limit,
            ],
            exact: true,
            refetchType: 'active',
          })
        }
        successCb()
        toast(data?.message, {
          type: 'success',
        })
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while editing comment',
        {
          type: 'error',
        }
      )
    },
  })

  return { approvePosts: mutate, isApprovingPosts: isPending }
}

export const useDeletePostComments = (successCb?: () => void) => {
  const activeProfileId = useProfileStore((s) => s.activeProfile?._id)
  const pageIndex = useHistoryStore((s) => s.pageIndex)
  const pageSize = useHistoryStore((s) => s.pageSize)
  const page = pageIndex + 1
  const limit = pageSize
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: deletePostComments,
    onSuccess: () => {
      if (activeProfileId) {
        queryClient.invalidateQueries({
          queryKey: [
            PostQueryEnum.GET_PENDING_POSTS,
            activeProfileId,
            page,
            limit,
          ],
          exact: true,
          refetchType: 'active',
        })
      }
      successCb?.()
      toast('Deleted successfully', { type: 'success' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while deleting',
        { type: 'error' }
      )
    },
  })

  return { deletePostComments: mutate, isDeletingPostComments: isPending }
}
