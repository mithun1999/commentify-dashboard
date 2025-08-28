import { useMutation, useQuery } from '@tanstack/react-query'
import { QueryService } from '@/services/query.service'
import { getUser, updateOnboardingStatus } from '../api/user.api'

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
  const queryClient = QueryService.getQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: updateOnboardingStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
    },
  })

  return {
    updateOnboardingStatus: mutate,
    isUpdatingOnboardingStatus: isPending,
  }
}
