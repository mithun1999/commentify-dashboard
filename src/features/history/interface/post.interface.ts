import { IProfile } from '@/features/users/interface/profile.interface'
import { CommentStatusEnum } from '../enum/comment.enum'

export type IntentSignal =
  | 'pain_expression'
  | 'tool_comparison'
  | 'asking_recommendation'
  | 'general_discussion'
  | 'no_signal'

export type TopicRelevance = 'high' | 'medium' | 'low'
export type PitchFit = 'natural' | 'tangential' | 'forced'

export interface ISalesContext {
  intentSignal: IntentSignal
  intentReasoning: string
  topicRelevance: TopicRelevance
  pitchFit: PitchFit
  pitchIncluded: boolean
}

export interface IPost {
  authorName: string
  authorProfileUrl: string
  authorProfileUrn: string
  content: string
  activityUrn: string
  comment?: IPostComment
  profileId: string
  createdAt: Date
  profile?: IProfile
  salesContext?: ISalesContext
  _id: string
}

export interface IPostComment {
  content: string
  entityUrn: string
  scheduledAt: Date
  postedAt: Date
  status: CommentStatusEnum
}
