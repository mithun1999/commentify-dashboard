import { create } from 'zustand'
import type { IProfileIdentity } from '@/features/users/interface/profile.interface'

export interface ReconnectPrompt {
  platform: 'linkedin' | 'twitter'
  profile: IProfileIdentity
}

interface ReconnectPromptState {
  prompt: (ReconnectPrompt & { resolve: (confirmed: boolean) => void }) | null
  /**
   * Opens the confirmation and resolves with the owner's answer. One dialog
   * is mounted per layout, so every connect surface shares the same flow.
   */
  ask: (prompt: ReconnectPrompt) => Promise<boolean>
  answer: (confirmed: boolean) => void
}

export const useReconnectPromptStore = create<ReconnectPromptState>(
  (set, get) => ({
    prompt: null,
    ask: (prompt) =>
      new Promise<boolean>((resolve) => {
        // A prompt already open is answered "no" so its caller never hangs.
        get().prompt?.resolve(false)
        set({ prompt: { ...prompt, resolve } })
      }),
    answer: (confirmed) => {
      const current = get().prompt
      set({ prompt: null })
      current?.resolve(confirmed)
    },
  })
)
