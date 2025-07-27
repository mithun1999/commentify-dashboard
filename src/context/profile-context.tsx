'use client'

import * as React from 'react'
import axios from 'axios'
import { getAuthToken } from '@/features/auth/utils/auth.util'
import { IProfile } from '@/features/users/interface/profile.interface'

interface LinkedInStats {
  followersStats: {
    followersGrowth: number
    followersGrowthPercent: number
    weeklyFollowersGrowth: number
    weeklyFollowersGrowthPercent: number
    fromDate: string
    toDate: string
    growth: {
      followersCount: number
      followersGrowth: number
      followersGrowthPercent: number
      period: string // date string
    }[]
  }
  profileViewerStats: {
    profileViewersGrowth: number
    profileViewersGrowthPercent: number
    weeklyProfileViewersGrowth: number
    weeklyProfileViewersGrowthPercent: number
    profileViewersGrowthSinceStartedUsingThisApp: number
    profileViewersGrowthSinceStartedUsingThisAppPercent: number
    fromDate: string
    toDate: string
    growth: []
    isPremium: boolean
  }
}

interface ProfileContextType {
  activeProfile: IProfile | null
  setActiveProfile: (profile: IProfile) => void
  linkedInStats: LinkedInStats | null
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(
  undefined
)

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [activeProfile, setActiveProfileState] =
    React.useState<IProfile | null>(null)
  const [linkedInStats, setLinkedInStats] =
    React.useState<LinkedInStats | null>(null)

  const setActiveProfile = async (profile: IProfile) => {
    const token = getAuthToken()
    setActiveProfileState(profile)
    setLinkedInStats(null)

    if (!token || !profile?._id) return

    try {
      const response = await axios.get(
        `https://api.commentify.co/li-stats/${profile._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLinkedInStats(response.data)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching LinkedIn stats:', error)
      setLinkedInStats(null)
    }
  }

  return (
    <ProfileContext.Provider
      value={{ activeProfile, setActiveProfile, linkedInStats }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export { ProfileContext }
