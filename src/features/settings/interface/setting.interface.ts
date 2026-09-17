import {
  CommentLengthEnum,
  EngagementThresholdEnum,
} from '../enum/setting.enum'

export type AgentMode = 'branding' | 'sales'
export type PitchIntensity = 'subtle' | 'moderate' | 'direct'
export type MatchMode = 'strict' | 'flexible'

/**
 * A targeting change Commentify made on the customer's behalf.
 *
 * Written when an under-delivering agent is corrected without waiting for the
 * customer to notice. `changed` is keyed by scrape-setting field, so the UI can
 * show exactly what moved rather than telling someone their settings are
 * different and leaving them to diff it.
 */
export interface ITargetingChange {
  id: string
  at: string
  actor: string
  reason: string
  changed: Record<string, { from: unknown; to: unknown }>
  revertedAt?: string
  revertedBy?: string
}

/**
 * `skipped` holds fields the customer has edited since the change, which an
 * undo deliberately leaves alone — overwriting a later choice of theirs would
 * be a second unrequested change.
 */
export interface IRevertTargetingChangeResult {
  restored: string[]
  cleared: string[]
  skipped: string[]
}

export interface ISalesSetting {
  websiteUrl: string
  productDescription: string
  painPoints: string[]
  valuePropositions: string[]
  pitchIntensity: PitchIntensity
  matchMode: MatchMode
  competitorNames: string[]
}

export interface ISetting {
  _id: string
  agentMode?: AgentMode
  monitoredProfiles?: string[]
  salesSetting?: ISalesSetting
  scrapeSetting?: {
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
  commentSetting?: {
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
  twitterScrapeSetting?: {
    allOfTheseWords: string[]
    thisExactPhrase?: string
    anyOfTheseWords: string[]
    noneOfTheseWords: string[]
    theseHashtags: string[]
    language: string
    numberOfPostsToScrapePerDay: number
    autoSchedule: boolean
    engagementThreshold?: EngagementThresholdEnum
    skipCompanyPosts?: boolean
    _id: string
    jobTiming?: {
      hours: number
      minutes: number
    }
  }
  twitterCommentSetting?: {
    turnOnEmoji: boolean
    turnOnExclamations: boolean
    turnOnHashtags: boolean
    writeInLowercase: boolean
    tagAuthor: boolean
    length?: CommentLengthEnum
    rules?: string
    examples?: string
    ownPrompt?: string
    callToActionText?: string
    _id: string
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
