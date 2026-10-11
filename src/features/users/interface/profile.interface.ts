import { ISetting } from '@/features/settings/interface/setting.interface'
import {
  ProfileBlockedReasonEnum,
  ProfileStatusEnum,
} from '../../users/enum/profile.enum'

export interface IProfile {
  _id: string
  firstName: string
  lastName: string
  about: string
  publicIdentifier: string
  profileUrn: string
  /** Never present on API responses any more; kept optional for old callers. */
  linkedinToken?: string
  csrfToken?: string
  ownerId: string
  status: ProfileStatusEnum
  blockedReason?: ProfileBlockedReasonEnum
  createdAt: Date
  setting?: ISetting
  platform?: 'linkedin' | 'twitter'
  twitterUserId?: string
  screenName?: string
  /** X Premium, read from the account; it unlocks long posts. */
  xPremium?: boolean
  activeAgentTypes?: string[]
  /** Agent slugs the owner switched off. Independent of `status`. */
  pausedAgentTypes?: string[]
  /**
   * Additive field from the backend's optional queue-enrichment read
   * (Workstream A1). `unavailable` means the profile itself loaded fine but
   * the backend could not confirm live schedule/queue state for it — the
   * account is still connected, but a next-run time should not be presented
   * as fact. Absent on responses from a backend that predates this field;
   * treat that the same as `available` for backward compatibility.
   */
  scheduleMetadataStatus?: 'available' | 'unavailable'
  /** Bumped by every deliberate disconnect/reconnect on the backend. */
  connectionVersion?: number
  disconnectedAt?: string
}

/** Non-sensitive identity the backend returns with a reconnect-required 409. */
export interface IProfileIdentity {
  _id?: string
  platform?: 'linkedin' | 'twitter'
  firstName?: string
  lastName?: string
  publicIdentifier?: string
  screenName?: string
  disconnectedAt?: string
  disconnectCleanupStatus?: 'pending' | 'running' | 'complete'
}

export interface ILinkProfileResponse {
  profile: IProfile
  isExisting: boolean
  /** The backend restored a deliberately disconnected account. */
  reconnected?: boolean
  /**
   * The link request itself was ambiguous (timeout / 5xx) and the connected
   * account was confirmed by an owner-scoped read instead.
   */
  reconciled?: boolean
}

export interface IDisconnectProfileResponse {
  profileId: string
  disconnected: true
  /**
   * "complete" once queued work was cancelled; "pending"/"running" when the
   * revocation is durable but the queue cleanup is still being retried.
   */
  cleanupStatus: 'pending' | 'running' | 'complete'
  disconnectedAt?: string
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

export interface ILinkProfilePayload extends IProfileResponseFromExtension {
  /**
   * Explicit owner consent to restore an account they disconnected. Only ever
   * set after the reconnect confirmation dialog; never by background flows.
   */
  reconnect?: boolean
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
