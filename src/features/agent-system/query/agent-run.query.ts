import { useQuery } from '@tanstack/react-query'
import { ApprovalReasonEnum } from '../enum/agent-run.enum'
import {
  getLatestAgentRun,
  getPendingApprovalCount,
} from '../api/agent-run.api'

enum AgentRunQueryEnum {
  GET_LATEST = 'agent-run-latest',
  PENDING_APPROVAL_COUNT = 'agent-pending-approval-count',
}

export function useGetAgentRunStatus(profileId?: string, platform?: string) {
  return useQuery({
    queryKey: [AgentRunQueryEnum.GET_LATEST, profileId, platform],
    enabled: Boolean(profileId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!profileId) return null
      return getLatestAgentRun(profileId, platform)
    },
  })
}

export function usePendingApprovalCount(profileId?: string) {
  return useQuery({
    queryKey: [AgentRunQueryEnum.PENDING_APPROVAL_COUNT, profileId],
    enabled: Boolean(profileId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!profileId) return { count: 0 }
      return getPendingApprovalCount(
        profileId,
        ApprovalReasonEnum.KEYWORD_BROADENING
      )
    },
  })
}
