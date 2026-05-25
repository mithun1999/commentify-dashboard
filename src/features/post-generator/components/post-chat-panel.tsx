import { useState, useRef, useEffect } from 'react'
import { IconSend, IconSparkles, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useChatEditPost } from '../query/post-generator.query'

interface PostChatPanelProps {
  post: any
  calendarId: string
  onContentUpdate: (content: string) => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  postSnapshot?: string
}

export function PostChatPanel({
  post,
  calendarId,
  onContentUpdate,
}: PostChatPanelProps) {
  const [input, setInput] = useState('')
  const [pendingIntent, setPendingIntent] = useState<
    'edit' | 'carousel' | 'image' | null
  >(null)
  const chatEditPost = useChatEditPost(calendarId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const messages: ChatMessage[] = post.editHistory ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, chatEditPost.isPending])

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
    chatEditPost.mutate(
      { postId: post._id, message: trimmed },
      {
        onSuccess: (data) => {
          if (!data?.action || data.action === 'edit_text') {
            onContentUpdate(data.content)
          }
        },
        onSettled: () => setPendingIntent(null),
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
              Ask the AI to refine your post, generate an image, or turn it
              into a carousel.
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
            {chatEditPost.isPending && (
              <div className='flex justify-start'>
                <div className='bg-muted flex items-center gap-2 rounded-lg px-3 py-2'>
                  <IconLoader2 className='size-3.5 animate-spin' />
                  <span className='text-muted-foreground text-xs'>
                    {pendingIntent === 'carousel'
                      ? 'Setting up a carousel from this post...'
                      : pendingIntent === 'image'
                        ? 'Working on the image...'
                        : 'Editing your post...'}
                  </span>
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
