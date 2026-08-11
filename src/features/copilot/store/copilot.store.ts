import { create } from 'zustand'

interface CopilotState {
  /**
   * A message typed somewhere other than the thread itself — the dock on the
   * Agent Hub, or the new-chat screen. Those surfaces mint the id and navigate;
   * the thread page picks the text up on mount and sends it, so the user sees
   * their question answered on the page rather than having to retype it there.
   */
  pending: { conversationId: string; text: string } | null
  handOff: (conversationId: string, text: string) => void
  takePending: (conversationId: string) => string | null
}

/**
 * Deliberately not persisted. A handoff is only meaningful between the click
 * and the navigation that follows it; restoring one from a previous session
 * would send a message the user did not just type.
 */
export const useCopilotStore = create<CopilotState>()((set, get) => ({
  pending: null,
  handOff: (conversationId, text) => set({ pending: { conversationId, text } }),
  // Read and clear in one call so a double-mount cannot send it twice.
  takePending: (conversationId) => {
    const { pending } = get()
    if (pending?.conversationId !== conversationId) return null
    set({ pending: null })
    return pending.text
  },
}))
