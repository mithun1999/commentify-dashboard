import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThinkingOrb } from '@/components/thinking-orb'
import { ScrollArea } from '@/components/ui/scroll-area'
import { envConfig } from '@/config/env.config'
import { getAuthToken } from '@/features/auth/utils/auth.util'
import { getConversation } from '../api/copilot.api'
import { useRefreshConversations } from '../query/copilot.query'
import { useCopilotStore } from '../store/copilot.store'
import { Composer } from './composer'
import { ToolActivity } from './tool-activity'

/**
 * One conversation. Mounted per thread id — the route keys on it — so all the
 * chat state belongs to the thread on screen and switching threads cannot leak
 * messages between them.
 */
export function CopilotThread({ conversationId }: { conversationId: string }) {
  const takePending = useCopilotStore((s) => s.takePending)
  const refreshConversations = useRefreshConversations()
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const booted = useRef(false)

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: `${envConfig.apiUrl}/copilot/chat`,
      // Read at request time, not at mount: the token is refreshed while a
      // long thread stays open.
      headers: () => ({ Authorization: `Bearer ${getAuthToken()}` }),
      body: () => ({ conversationId }),
    }),
    // The list is keyed on titles the server derives from the first message,
    // so it is only correct once a turn has landed.
    onFinish: () => void refreshConversations(),
  })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    // Guarded rather than keyed on a dependency: this must run exactly once per
    // thread, and StrictMode runs every effect twice.
    if (booted.current) return
    booted.current = true

    const handedOff = takePending(conversationId)
    if (handedOff) {
      void sendMessage({ text: handedOff })
      return
    }

    setLoading(true)
    void getConversation(conversationId)
      .then((c) => setMessages((c?.messages ?? []) as UIMessage[]))
      // A thread the server has never heard of is just an empty one. That is
      // the normal case for a fresh id someone opened without saying anything.
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [conversationId, takePending, sendMessage, setMessages])

  // Radix ScrollArea wraps its content in a `display: table` element, which
  // stops `scrollIntoView` from driving the viewport, so scroll it directly.
  // Only when the reader is already at the bottom — yanking them down while
  // they read back through the thread is worse than not following the stream.
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )
    if (!viewport || !stick.current) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages, status, loading])

  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    stick.current = el.scrollHeight - el.clientHeight - el.scrollTop < 80
  }

  const send = (text: string) => {
    stick.current = true
    void sendMessage({ text })
  }

  return (
    <>
      {/* `min-h-0` or the flex child refuses to shrink below its content and
          the thread pushes the composer off the bottom of the page. */}
      <ScrollArea
        ref={scrollRef}
        className='min-h-0 flex-1'
        onScrollCapture={onScroll}
      >
        <div className='mx-auto max-w-3xl space-y-5 px-4 py-6'>
          {loading && (
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Loader2 className='size-4 animate-spin' />
              Loading this chat
            </div>
          )}

          {messages.map((message, index) => (
            <div
              // The SDK hands back an empty id on some assistant turns, and two
              // of those in a thread collide as keys.
              key={message.id || `position-${index}`}
              className={cn(
                'space-y-2 text-sm',
                message.role === 'user' && 'flex justify-end'
              )}
            >
              {message.role === 'user' ? (
                <div className='bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap'>
                  {message.parts
                    .filter((p) => p.type === 'text')
                    .map((p, i) => (
                      <span key={i}>{(p as { text: string }).text}</span>
                    ))}
                </div>
              ) : (
                message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <p key={i} className='leading-relaxed whitespace-pre-wrap'>
                        {part.text}
                      </p>
                    )
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <ToolActivity
                        key={i}
                        toolName={getToolName(part)}
                        state={part.state}
                        input={part.input as Record<string, unknown>}
                        output={part.output as never}
                      />
                    )
                  }
                  return null
                })
              )}
            </div>
          ))}

          {status === 'submitted' && (
            <div className='flex items-center gap-2'>
              <ThinkingOrb
                size={22}
                className='text-primary'
                label='Thinking'
              />
              <span className='text-shimmer text-sm'>Thinking</span>
            </div>
          )}

          {error && (
            <p className='text-destructive text-xs'>
              Something went wrong. Try again.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className='bg-background border-t'>
        <div className='mx-auto max-w-3xl px-4 py-3'>
          <Composer
            autoFocus
            onSubmit={send}
            busy={busy}
            onStop={stop}
            className='shadow-none'
          />
        </div>
      </div>
    </>
  )
}
