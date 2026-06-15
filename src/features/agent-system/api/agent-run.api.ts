import { axiosInstance } from '@/utils/axios.util'
import type { IAgentRunStat } from '../interface/agent-run.interface'

export async function getLatestAgentRun(profileId: string, platform?: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/agent-run-stat/${profileId}/latest`,
    params: platform ? { platform } : undefined,
  })
  return data as IAgentRunStat | null
}

export async function getPendingApprovalCount(
  profileId: string,
  approvalReason: string
) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/post/pending-approval-count/${profileId}`,
    params: { approvalReason },
  })
  return data as { count: number }
}
