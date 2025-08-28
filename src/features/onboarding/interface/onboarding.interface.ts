import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'

export interface ICreateOnboardingCommentDto {
  aboutProfile: string
  length: CommentLengthEnum
  commentsPerDay: number
  turnOnEmoji: boolean
  turnOnExclamations: boolean
}

export interface ICreateOnboardingPostDto {
  keywordsToTarget: string[]
  authorTitles: string[]
  skipHiringPosts: boolean
  skipJobUpdatePosts: boolean
}

export interface IOnboardingCommentPayload {
  profileId: string
  data: ICreateOnboardingCommentDto
}

export interface IOnboardingPostPayload {
  profileId: string
  data: ICreateOnboardingPostDto
}
