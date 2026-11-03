import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AiKeyProvider,
  type AiKeyView,
  listAiKeys,
  recheckAiKey,
  removeAiKey,
  saveAiKey,
} from '../api/ai-keys.api'

export enum AiKeysQueryEnum {
  LIST = 'ai-keys',
}

/** Only accounts that run on their own keys (AppSumo licenses) have any. */
export const useAiKeysQuery = (enabled: boolean) =>
  useQuery({
    queryKey: [AiKeysQueryEnum.LIST],
    queryFn: listAiKeys,
    enabled,
    refetchOnWindowFocus: false,
    // The screens that read this show their own error state.
    meta: { suppressGlobalErrorToast: true },
  })

const useKeyMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // The key form shows the provider's own reason inline.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [AiKeysQueryEnum.LIST] }),
  })
}

export const useSaveAiKey = () =>
  useKeyMutation(
    ({ provider, key }: { provider: AiKeyProvider; key: string }) =>
      saveAiKey(provider, key)
  )

export const useRecheckAiKey = () =>
  useKeyMutation((provider: AiKeyProvider) => recheckAiKey(provider))

export const useRemoveAiKey = () =>
  useKeyMutation((provider: AiKeyProvider) => removeAiKey(provider))

/** The key everything runs on. Without a working one, no agent can run. */
export function openRouterKeyOf(keys?: AiKeyView[]): AiKeyView | undefined {
  return keys?.find((k) => k.provider === 'openrouter')
}

/** True when the agents can run: an OpenRouter key that works and has credit. */
export function hasWorkingOpenRouterKey(keys?: AiKeyView[]): boolean {
  return openRouterKeyOf(keys)?.status === 'valid'
}
