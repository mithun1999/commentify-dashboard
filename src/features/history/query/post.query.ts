import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { QueryService } from '@/services/query.service'
import { toast } from 'react-toastify'
import {
  approvePosts,
  editPostComment,
  getCompletedPosts,
  getPendingPosts,
} from '../api/post.api'
import { IPost } from '../interface/post.interface'

export enum PostQueryEnum {
  GET_COMPLETED_POSTS = 'get-completed-posts',
  GET_PENDING_POSTS = 'get-pending-posts',
}

export const useGetCompletedPostsQuery = () => {
  const {
    data,
    isPending,
    isFetching,
    isFetched,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: PostQueryEnum.GET_COMPLETED_POSTS,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getCompletedPosts(pageParam)
      return response
    },
    placeholderData: null,
    retry: 1,
    getPreviousPageParam: (firstPage) => firstPage.prevPage ?? undefined,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  })

  return {
    data,
    isPending,
    isFetching,
    isFetched,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  }
}

export const useGetPendingPostsQuery = (page: number) => {
  const { isPending, isError, error, data, isFetching, isPreviousData } =
    useQuery({
      queryKey: [PostQueryEnum.GET_PENDING_POSTS, page],
      queryFn: () => getPendingPosts(page),
      keepPreviousData: true,
    })

  return {
    isPending,
    isError,
    error,
    data,
    isFetching,
    isPreviousData,
  }
}

export const useUpdatePostComment = (cb: (data: string) => void) => {
  const { mutate, isPending } = useMutation(editPostComment, {
    onSuccess: (data: IPost) => {
      cb(data?.activityUrn)
      toast('Comment updated successfully', {
        type: 'success',
      })
    },
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

export const useApprovePosts = (page: number, successCb: () => void) => {
  const { mutate, isPending } = useMutation(approvePosts, {
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data?.success) {
        const queryClient = QueryService.getQueryClient()
        queryClient.invalidateQueries([PostQueryEnum.GET_PENDING_POSTS, page])
        successCb()
        toast(data?.message, {
          type: 'success',
        })
      }
    },
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
