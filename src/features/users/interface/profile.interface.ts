import { ISetting } from '@/features/settings/interface/setting.interface'
import { ProfileStatusEnum } from '../../users/enum/profile.enum'

export interface IProfile {
  _id: string
  firstName: string
  lastName: string
  about: string
  publicIdentifier: string
  profileUrn: string
  linkedinToken: string
  csrfToken: string
  ownerId: string
  status: ProfileStatusEnum
  createdAt: Date
  setting?: ISetting
}

export interface IProfileResponseFromExtension {
  userAgent: string
  ja3Text?: string
  isWindowsBasedSystem: boolean
  profileUrn?: string
  publicIdentifier?: string
  firstName?: string
  lastName?: string
  linkedinToken: string
  csrfToken: string
}

export interface ILinkProfilePayload extends IProfileResponseFromExtension {}

export interface ILinkedInStats {
  followersStats: {
    followersGrowth: number
    followersGrowthPercent: number
    followersGrowthSinceStartedUsingThisApp: number
    followersGrowthSinceStartedUsingThisAppPercent: number
    followersGrowthSinceThreeMonths: number
    followersGrowthSinceThreeMonthsPercent: number
    weeklyFollowersGrowth: number
    weeklyFollowersGrowthPercent: number
    fromDate: string
    toDate: string
    growth: {
      followersCount: number
      followersGrowth: number
      followersGrowthPercent: number
      period: string
    }[]
  }
  profileViewerStats: {
    profileViewersGrowth: number
    profileViewersGrowthPercent: number
    weeklyProfileViewersGrowth: number
    weeklyProfileViewersGrowthPercent: number
    profileViewersGrowthSinceStartedUsingThisApp: number
    profileViewersGrowthSinceStartedUsingThisAppPercent: number
    profileViewersGrowthSinceThreeMonths: number
    profileViewersGrowthSinceThreeMonthsPercent: number
    fromDate: string
    toDate: string
    growth: []
    isPremium: boolean
  }
  postCommentStats: {
    scheduled: number
    pending: number
    completed: number
  }
}
