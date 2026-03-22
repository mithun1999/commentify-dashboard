import { type ComponentType } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { type IUser } from '@/features/auth/interface/user.interface'
import { type ProfileStatusEnum } from '@/features/users/enum/profile.enum'

export type Platform = 'linkedin' | 'twitter'
export type AccessLevel = 'open' | 'invite-only'

export interface AgentTypeDefinition {
  slug: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  platform: Platform
  access: AccessLevel
  badge?: string
  isEligible?: (user: IUser) => boolean
  scrapeSettingsComponent: ComponentType<{ profileId: string }>
  commentSettingsComponent: ComponentType<{ profileId: string }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queueColumns: ColumnDef<any, any>[]
  queueItemComponent: ComponentType<{ postId: string }>
}

export interface DerivedAgent {
  id: string
  type: string
  profileId: string
  profileName: string
  profileAvatar?: string
  platform: Platform
  status: ProfileStatusEnum
}
