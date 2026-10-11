import { useState, useRef, useEffect } from 'react'
import {
  IconBooks,
  IconSend,
  IconSparkles,
  IconCheck,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThinkingOrb } from '@/components/thinking-orb'
import {
  NoteChips,
  NotePicker,
  useNoteTagging,
} from '@/features/library/components/note-picker'
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
  /** Library notes tagged in this message. */
  noteTitles?: string[]
}

/** The notes a message tagged, under its text. */
function TaggedTitles({ titles }: { titles?: string[] }) {
  if (!titles?.length) return null
  return (
    <div className='mt-1.5 flex flex-wrap gap-1'>
      {titles.map((title, i) => (
        <span
          key={i}
          className='inline-flex max-w-full items-center gap-1 rounded bg-black/10 px-1.5 py-0.5 text-[11px] dark:bg-white/15'
        >
          <IconBooks className='size-3 shrink-0' />
          <span className='truncate'>{title}</span>
        </span>
      ))}
    </div>
  )
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
  const [pendingNotes, setPendingNotes] = useState<string[]>([])
  // Library notes tagged with "@" or the Library button, sent with the
  // next message.
  const tagging = useNoteTagging()
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

  const canSend =
    (input.trim().length > 0 || tagging.ids.length > 0) &&
    !chatEditPost.isPending

  const handleSend = () => {
    if (!canSend) return
    // Tagging notes is a request on its own.
    const trimmed = input.trim() || 'Use the tagged notes in this post.'
    const noteIds = tagging.ids

    setInput('')
    setPendingIntent(guessIntent(trimmed))
    setPendingMessage(trimmed)
    setPendingNotes(tagging.tagged.map((n) => n.title))
    tagging.clear()
    // The last turn's steps outlive it, and the first event of this one is a
    // round trip away. Without this the panel opens on the old list.
    clearSteps()
    onBusyChange?.(true)
    chatEditPost.mutate(
      { postId: post._id, message: trimmed, noteIds },
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
          setPendingNotes([])
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
                  {msg.role === 'user' && (
                    <TaggedTitles titles={msg.noteTitles} />
                  )}
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
                  <TaggedTitles titles={pendingNotes} />
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

      <div className='shrink-0 space-y-2 border-t p-3'>
        <NoteChips tagged={tagging.tagged} onRemove={tagging.remove} />
        <div className='flex items-end gap-2'>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) =>
              setInput(tagging.onTextChange(e.target.value, input))
            }
            onKeyDown={handleKeyDown}
            placeholder={
              tagging.tagged.length > 0
                ? 'What should it take from these notes?'
                : 'Edit the post, generate an image, or make it a carousel...'
            }
            className='max-h-20 min-h-[40px] resize-none text-sm'
            rows={1}
          />
          <Button
            size='icon'
            className='size-9 shrink-0'
            onClick={handleSend}
            disabled={!canSend}
          >
            <IconSend className='size-4' />
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <NotePicker
            tagging={tagging}
            setText={setInput}
            profileId={profileId}
            returnFocusTo={inputRef}
          />
          <span className='text-muted-foreground text-[11px]'>
            or type @ to use a note from your Knowledge Hub
          </span>
        </div>
      </div>
    </div>
  )
}
