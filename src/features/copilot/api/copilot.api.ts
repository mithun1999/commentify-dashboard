import type { UIMessage } from 'ai'
import { axiosInstance } from '@/utils/axios.util'

export interface IConversationSummary {
  _id: string
  title?: string
  lastMessageAt: string
  profileId?: string
}

export interface IConversation extends IConversationSummary {
  messages: UIMessage[]
}

export async function listConversations() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/copilot/conversations',
  })
  return data as IConversationSummary[]
}

export interface IToolResult {
  ok: boolean
  data?: Record<string, unknown>
  refusal?: { reason: string; message: string }
}

/**
 * Approve a held tool call. Deliberately not part of the chat stream — the
 * point of the confirmation is that it takes an action the model cannot take.
 */
export async function confirmToolCall(confirmationId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/copilot/confirmations/${confirmationId}`,
  })
  return data as IToolResult
}

export async function getConversation(id: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/copilot/conversations/${id}`,
  })
  return data as IConversation
}
