import type {
  AgentRunStatusEnum,
  ShortfallReasonEnum,
} from '../enum/agent-run.enum'

export interface IAgentRunStat {
  _id: string
  profileId: string
  platform: string
  agentMode?: string
  targetLimit?: number
  postsFetched?: number
  postsAnalyzed?: number
  postsCommented?: number
  status?: AgentRunStatusEnum
  shortfallReason?: ShortfallReasonEnum
  remediationApplied?: string[]
  dateWindowUsed?: string
  suggestedKeywords?: string[]
  postsQueuedForApproval?: number
  failureCause?: string
  createdAt: string
}
