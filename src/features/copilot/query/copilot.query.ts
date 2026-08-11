import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listConversations } from '../api/copilot.api'

export enum CopilotQueryEnum {
  LIST_CONVERSATIONS = 'copilot-conversations',
}

export const useConversationsQuery = () =>
  useQuery({
    queryKey: [CopilotQueryEnum.LIST_CONVERSATIONS],
    queryFn: listConversations,
  })

/**
 * A thread only appears in the list once its first message has been persisted,
 * and its title is derived server-side from that message, so the list is stale
 * the moment a turn ends.
 */
export const useRefreshConversations = () => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: [CopilotQueryEnum.LIST_CONVERSATIONS],
    })
}
