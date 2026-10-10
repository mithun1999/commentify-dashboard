import { axiosInstance } from '@/utils/axios.util'

export interface IMcpConnection {
  id: string
  name: string
  clientUri?: string
  logoUri?: string
  /** Where the app received the sign-in: its one unfakeable identity. */
  redirectHost?: string
  connectedAt?: string
  lastUsedAt?: string
}

export interface IMcpStatus {
  serverUrl: string
  /** MCP is a Pro feature. */
  eligible: boolean
  connections: IMcpConnection[]
}

export interface IConsentRequest {
  requestId: string
  client: { name: string; uri?: string; logoUri?: string }
  redirectHost: string
  /** Set when we recognise the app by where it redirects; null means warn. */
  knownAs: string | null
  eligible: boolean
  expiresAt: string
}

export async function getMcpStatus() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: '/mcp-connections',
  })
  return data as IMcpStatus
}

export async function disconnectMcpApp(id: string) {
  const { data } = await axiosInstance({
    method: 'DELETE',
    url: `/mcp-connections/${id}`,
  })
  return data as { disconnected: boolean }
}

export async function getConsentRequest(requestId: string) {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/mcp-oauth/requests/${encodeURIComponent(requestId)}`,
  })
  return data as IConsentRequest
}

export async function approveConsentRequest(requestId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/mcp-oauth/requests/${encodeURIComponent(requestId)}/approve`,
  })
  return data as { redirectUrl: string }
}

export async function denyConsentRequest(requestId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/mcp-oauth/requests/${encodeURIComponent(requestId)}/deny`,
  })
  return data as { redirectUrl: string }
}
