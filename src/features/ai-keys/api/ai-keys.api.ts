import { axiosInstance } from '@/utils/axios.util'

export type AiKeyProvider = 'openrouter' | 'openai'

export type AiKeyStatus = 'valid' | 'invalid' | 'out_of_credit' | 'unreachable'

/** A saved key as the backend shows it: never the key itself. */
export interface AiKeyView {
  provider: AiKeyProvider
  last4: string
  status: AiKeyStatus
  lastCheckedAt?: string
  lastError?: string
  creditRemainingUsd?: number | null
}

export async function listAiKeys(): Promise<AiKeyView[]> {
  const { data } = await axiosInstance({ method: 'GET', url: '/user/ai-keys' })
  return data
}

/** Checked with the provider before it is saved; a bad key is refused (400). */
export async function saveAiKey(
  provider: AiKeyProvider,
  key: string
): Promise<AiKeyView> {
  const { data } = await axiosInstance({
    method: 'PUT',
    url: `/user/ai-keys/${provider}`,
    data: { key },
  })
  return data
}

export async function recheckAiKey(
  provider: AiKeyProvider
): Promise<AiKeyView> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/user/ai-keys/${provider}/check`,
  })
  return data
}

export async function removeAiKey(provider: AiKeyProvider) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/user/ai-keys/${provider}`,
  })
  return data as { removed: boolean }
}
