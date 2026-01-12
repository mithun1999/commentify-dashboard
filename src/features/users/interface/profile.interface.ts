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

// Response types for extension communication
export interface ICookie {
  domain: string
  hostOnly: boolean
  httpOnly: boolean
  name: string
  path: string
  sameSite: string
  secure: boolean
  session: boolean
  storeId: string
  value: string
  expirationDate?: number
}

export interface ICookiesResponse {
  success: boolean
  cookies: ICookie[]
}

export interface IBrowserDetailsData {
  user_agent: string
  ja4: string
  ja4_r: string
  ja4_o: string
  ja4_ro: string
  ja3_hash: string
  ja3_text: string
  ja3n_hash: string
  ja3n_text: string
  akamai_hash: string
  akamai_text: string
}

export interface IBrowserDetailsResponse {
  success: boolean
  data: IBrowserDetailsData
}

export interface ILinkedInStats {
  followersStats: {
    totalFollowers: number
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
