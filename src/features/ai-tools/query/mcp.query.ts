import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  disconnectMcpApp,
  getConsentRequest,
  getMcpStatus,
} from '../api/mcp.api'

export enum McpQueryEnum {
  STATUS = 'mcp-status',
  CONSENT_REQUEST = 'mcp-consent-request',
}

export const useMcpStatusQuery = () =>
  useQuery({
    queryKey: [McpQueryEnum.STATUS],
    queryFn: getMcpStatus,
    // Connections appear when an app finishes signing in elsewhere.
    refetchOnWindowFocus: true,
    // The page shows its own error state.
    meta: { suppressGlobalErrorToast: true },
  })

export const useDisconnectMcpApp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnectMcpApp,
    // The disconnect dialog shows its own error.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [McpQueryEnum.STATUS] }),
  })
}

/**
 * A consent request is single-use and expires in ten minutes, so it is never
 * retried or refetched: a second read after approval would only say "expired".
 */
export const useConsentRequestQuery = (requestId: string, enabled: boolean) =>
  useQuery({
    queryKey: [McpQueryEnum.CONSENT_REQUEST, requestId],
    queryFn: () => getConsentRequest(requestId),
    enabled: enabled && Boolean(requestId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // The consent screen explains an expired or failed request itself.
    meta: { suppressGlobalErrorToast: true },
  })
