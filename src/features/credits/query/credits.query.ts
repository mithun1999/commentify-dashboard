import { useQuery } from '@tanstack/react-query'
import { getCredits } from '../api/credits.api'

export enum CreditsQueryEnum {
  GET_CREDITS = 'get-credits',
}

export const useGetCreditsQuery = () => {
  const { data, isLoading } = useQuery({
    queryKey: [CreditsQueryEnum.GET_CREDITS],
    queryFn: () => getCredits(),
    initialData: null,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  return { data, isLoading }
}
