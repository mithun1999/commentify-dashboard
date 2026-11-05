import { axiosInstance, axiosInstanceWithoutToken } from '@/utils/axios.util'
import { getAuthToken } from '@/features/auth/utils/auth.util'

export type RedeemResult =
  | {
      state: 'claimable'
      claimToken: string
      tier?: number
      accounts?: number
      planTier?: string
    }
  | { state: 'linked'; yours: boolean }
  | { state: 'deactivated' }

export interface AppsumoLicense {
  licenseKeyEnding: string
  tier?: number
  accounts?: number
  planTier?: string
  status: 'inactive' | 'active' | 'superseded' | 'deactivated'
  linkedAt?: string
  /** Across every license on the account, when more than one stacks. */
  totalAccounts?: number
  /** The highest tier held, whose limits apply to the whole account. */
  totalTier?: number
}

/** A plan the account still pays for, from a 409 PAID_PLAN on link. */
export interface BilledPlan {
  name?: string
  price?: number
  interval?: string
  renewsAt?: string
  onTrial: boolean
}

/**
 * Trades the one-time code AppSumo put on our redirect URL for a claim token.
 * Public: the buyer usually has no Commentify account yet. The session goes
 * along when there is one, so a returning buyer's own license reads as theirs.
 */
export async function redeemAppsumoCode(code: string): Promise<RedeemResult> {
  const token = await getAuthToken()
  const { data } = await axiosInstanceWithoutToken({
    method: 'POST',
    url: '/appsumo/redeem',
    data: { code },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return data
}

/** Links the claimed license to the signed-in account and grants its plan. */
export async function linkAppsumoLicense(
  claimToken: string,
  options: { cancelCurrentPlan?: boolean } = {}
): Promise<AppsumoLicense> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/appsumo/link',
    data: { claimToken, ...options },
  })
  return data
}

export async function getAppsumoLicense(): Promise<AppsumoLicense | null> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/appsumo/license',
  })
  return data?.license ?? null
}
