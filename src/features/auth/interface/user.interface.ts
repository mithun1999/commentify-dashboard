import {
  IProduct,
  IProductVariant,
} from '@/features/pricing/interfaces/price.interface'
import { ISubscription } from '@/features/subscription/interfaces/subscription.interface'

export enum UserSubscriptionStatus {
  IN_TRIAL = 'in-trial',
  TRIAL_EXPIRED = 'trial-expired',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  provider: string
  providerId: string
  image: IMedia
  intent: string
  subscribedProduct?: IProduct
  subscribedProductId: string
  subscribedProductVariantId: string
  subscribedProductVariant?: IProductVariant
  status: UserSubscriptionStatus
  subscription?: ISubscription | null
  metadata: {
    onboarding: {
      status: 'not-started' | 'in-progress' | 'completed'
      step: number
    }
  }
}

export interface IMedia {
  _id: string
  url: string
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
