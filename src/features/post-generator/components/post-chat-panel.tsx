import { useState, useRef, useEffect } from 'react'
import { IconSend, IconSparkles, IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThinkingOrb } from '@/components/thinking-orb'
import {
  useChatEditPost,
  usePostEditStream,
} from '../query/post-generator.query'

interface PostChatPanelProps {
  post: any
  calendarId: string
  profileId: string
  onContentUpdate: (content: string) => void
  onBusyChange?: (busy: boolean) => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  postSnapshot?: string
}

/**
 * Shown until the agent's first step arrives, which is a round trip away.
 * A guess is fine here because it is replaced by what actually happened.
 */
function optimisticLabel(intent: 'edit' | 'carousel' | 'image' | null): string {
  if (intent === 'carousel') return 'Setting up the carousel'
  if (intent === 'image') return 'Working on the image'
  return 'Reading your post'
}

export function PostChatPanel({
  post,
  calendarId,
  profileId,
  onContentUpdate,
  onBusyChange,
}: PostChatPanelProps) {
  const [input, setInput] = useState('')
  const [pendingIntent, setPendingIntent] = useState<
    'edit' | 'carousel' | 'image' | null
  >(null)
  // The transcript is the post's saved history, which only gains this message
  // when the turn ends. Without an echo, sending appears to swallow it.
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const chatEditPost = useChatEditPost(calendarId)
  const { steps, clearSteps } = usePostEditStream(
    chatEditPost.isPending ? profileId : undefined,
    post._id
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const messages: ChatMessage[] = post.editHistory ?? []
  // The newest step is what it is doing now; everything before it is finished.
  const done = steps.slice(0, -1)
  const current = steps[steps.length - 1]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, chatEditPost.isPending, steps.length])

  const guessIntent = (text: string): 'edit' | 'carousel' | 'image' => {
    const t = text.toLowerCase()
    if (/(carousel|slides?|pdf|deck)/.test(t)) return 'carousel'
    if (/(image|screenshot|chat|dashboard|picture|visual)/.test(t))
      return 'image'
    return 'edit'
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || chatEditPost.isPending) return

    setInput('')
    setPendingIntent(guessIntent(trimmed))
    setPendingMessage(trimmed)
    // The last turn's steps outlive it, and the first event of this one is a
    // round trip away. Without this the panel opens on the old list.
    clearSteps()
    onBusyChange?.(true)
    chatEditPost.mutate(
      { postId: post._id, message: trimmed },
      {
        onSuccess: (data) => {
          // One turn can rewrite the body and queue a carousel, so the flag
          // rather than the headline action decides whether the editor reloads.
          if (
            data?.contentChanged ??
            (!data?.action || data.action === 'edit_text')
          ) {
            onContentUpdate(data.content)
          }
        },
        onSettled: () => {
          setPendingIntent(null)
          setPendingMessage(null)
          onBusyChange?.(false)
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b px-4 py-3'>
        <IconSparkles className='text-muted-foreground size-4' />
        <span className='text-sm font-medium'>AI Assistant</span>
      </div>

      <div className='flex-1 overflow-y-auto p-4' ref={scrollRef}>
        {messages.length === 0 && !chatEditPost.isPending ? (
          <div className='flex flex-col items-center justify-center gap-2 py-12'>
            <IconSparkles className='text-muted-foreground/40 size-8' />
            <p className='text-muted-foreground text-center text-xs'>
              Ask the AI to refine your post, generate an image, or turn it into
              a carousel.
              <br />
              Try: "Tighten the hook", "Generate an image", or "Convert this
              into a 5-slide carousel"
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className='whitespace-pre-wrap'>{msg.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-[10px] opacity-50',
                      msg.role === 'user'
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {pendingMessage && (
              <div className='flex justify-end'>
                <div className='bg-primary text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm'>
                  <p className='whitespace-pre-wrap'>{pendingMessage}</p>
                </div>
              </div>
            )}
            {chatEditPost.isPending && (
              <div className='flex justify-start'>
                <div className='bg-muted max-w-[85%] space-y-1.5 rounded-lg px-3 py-2'>
                  {done.map((step) => (
                    <div
                      key={step.key}
                      className='text-muted-foreground flex items-center gap-2 text-xs'
                    >
                      <IconCheck className='size-3 shrink-0' />
                      <span>{step.label}</span>
                    </div>
                  ))}
                  <div className='flex items-center gap-2'>
                    <ThinkingOrb size={16} className='text-primary' />
                    <span className='text-shimmer text-xs'>
                      {current?.label ?? optimisticLabel(pendingIntent)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className='shrink-0 border-t p-3'>
        <div className='flex items-end gap-2'>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Edit the post, generate an image, or make it a carousel...'
            className='max-h-20 min-h-[40px] resize-none text-sm'
            rows={1}
          />
          <Button
            size='icon'
            className='size-9 shrink-0'
            onClick={handleSend}
            disabled={!input.trim() || chatEditPost.isPending}
          >
            <IconSend className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
