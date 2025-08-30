import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUser, updateOnboardingStatus } from '../api/user.api'
import { IUser } from '../interface/user.interface'

export enum UserQueryEnum {
  GET_USER = 'get-user',
}

export const useGetUserQuery = () => {
  const { data, isLoading, isFetching, isFetched } = useQuery({
    queryKey: [UserQueryEnum.GET_USER],
    queryFn: getUser,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5,
    // CHECK: Keeping this because it was added previously due to some error
    // placeholderData: null,
  })
  return { data, isLoading, isFetching, isFetched }
}

export const useUpdateOnboardingStatus = () => {
  const queryClient = useQueryClient()
  const { mutate, mutateAsync, isPending } = useMutation<
    IUser,
    unknown,
    {
      status: 'not-started' | 'in-progress' | 'completed'
      step: number
      heardFrom?: string
    }
  >({
    mutationFn: updateOnboardingStatus,
    onSuccess: (data) => {
      queryClient.setQueryData([UserQueryEnum.GET_USER], data)
    },
  })

  return {
    updateOnboardingStatus: mutate,
    updateOnboardingStatusAsync: mutateAsync,
    isUpdatingOnboardingStatus: isPending,
  }
}
