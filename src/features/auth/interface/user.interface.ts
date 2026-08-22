import { IProduct } from '@/features/pricing/interfaces/price.interface'
import { ISubscription } from '@/features/subscription/interfaces/subscription.interface'

export enum UserSubscriptionStatus {
  PENDING = 'pending',
  IN_TRIAL = 'in-trial',
  TRIAL_EXPIRED = 'trial-expired',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export type PlanTier = 'starter' | 'pro' | 'premium'
export type AgentType = 'comment' | 'post'

export interface IAgentEntitlement {
  tier: PlanTier
  active: boolean
  /** Profile (connected-account) slots for this agent. Independent per agent. */
  profiles?: number
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
  status: UserSubscriptionStatus
  subscription?: ISubscription | null
  agents?: Partial<Record<AgentType, IAgentEntitlement>>
  trialEndsAt?: string | null
  metadata: {
    onboarding: {
      status: 'not-started' | 'in-progress' | 'completed'
      /**
       * Position in the flow. Kept alongside `stepKey` because Brevo's
       * ONBOARDING_STEP attribute and its drip automations are typed on a
       * number; `stepKey` is what routing reads.
       */
      step: number
      stepKey?: string
      selectedAgentType?: string
    }
    heardFrom?: string
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
