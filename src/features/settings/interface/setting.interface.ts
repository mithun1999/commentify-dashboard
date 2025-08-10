import {
  CommentLengthEnum,
  EngagementThresholdEnum,
} from '../enum/setting.enum'

export interface ISetting {
  _id: string
  scrapeSetting: {
    keywordsToTarget: string[]
    skipHiringPosts: boolean
    skipArticlePosts: boolean
    skipJobUpdatePosts: boolean
    skipCompanyPosts: boolean
    blackListedAccounts: string[]
    languageToTarget: string
    numberOfPostsToScrapePerDay: number
    _id: string
    authorTitlesToTarget: string[]
    rules?: string
    jobTiming: {
      hours: number
      minutes: number
      tz: string
    }
    engagementThreshold?: EngagementThresholdEnum
    autoSchedule: boolean
    regionsToTarget?: string[]
  }
  commentSetting: {
    turnOnEmoji: boolean
    turnOnExclamations: boolean
    turnOnHashtags: boolean
    writeInLowercase: boolean
    tagAuthor: boolean
    _id: string
    about?: string
    rules?: string
    length?: CommentLengthEnum
  }
  ownerId: string
  profileId: string
  createdAt: string
  updatedAt: string
}

export interface IScrapeSettingForm {
  skipHiringPosts: boolean
  skipArticlePosts: boolean
  skipJobUpdatePosts: boolean
  skipCompanyPosts: boolean
  keywordsToTarget: string[]
  numberOfPostsToScrapePerDay: number
  keyword: string
  autoSchedule: boolean
  engagementThreshold?: EngagementThresholdEnum
  rules?: string
  hours: number
  minutes: number
  period: 'AM' | 'PM'
}

export interface ICommentSettingForm {
  turnOnEmoji: boolean
  turnOnExclamations: boolean
  turnOnHashtags: boolean
  profession: string
  assistanceDescription: string
  experienceDescription: string
  learnings: string
  additionalNotes: string
  about: string
  tagAuthor?: boolean
  length?: CommentLengthEnum
  rules?: string
}

export interface ISettingPayload {
  commentSetting: ICommentSettingForm
  scrapeSetting: Omit<IScrapeSettingForm, 'keyword'>
  profileId: string
  ja3Text?: string
  about?: string
}

export interface IPostSettingForm {}
export interface ICommentSettingForm {}

export interface IScrapeSettingPayload {
  keywordsToTarget: string[]
  skipHiringPosts?: boolean
  skipJobUpdatePosts?: boolean
  skipArticlePosts?: boolean
  skipCompanyPosts?: boolean
  autoSchedule?: boolean
  blackListedAccounts?: string[]
  languageToTarget?: string
  numberOfPostsToScrapePerDay: number
  jobTiming: {
    hours: number
    minutes: number
    tz: string
  }
}

export interface ICommentSettingPayload {
  turnOnEmoji?: boolean
  turnOnExclamations?: boolean
  turnOnHashtags?: boolean
  writeInLowercase?: boolean
  tagAuthor?: boolean
  length?: CommentLengthEnum
  rules?: string
  examples?: string
  ownPrompt?: string
}
