import { useNavigate } from '@tanstack/react-router'
import { useCopilotStore } from '../store/copilot.store'
import { newConversationId } from '../utils/conversation-id'

/**
 * Opens a new thread with a question already asked. The dock and the new-chat
 * screen both take the first message somewhere the answer cannot be shown, so
 * they mint the id, park the text, and let the thread page send it on arrival.
 */
export function useStartChat() {
  const navigate = useNavigate()
  const handOff = useCopilotStore((s) => s.handOff)

  return (text: string) => {
    const conversationId = newConversationId()
    handOff(conversationId, text)
    void navigate({
      to: '/copilot/$conversationId',
      params: { conversationId },
    })
  }
}
