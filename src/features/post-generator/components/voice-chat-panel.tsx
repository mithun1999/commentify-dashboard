import { useState, useRef, useEffect } from 'react'
import {
  IconSend,
  IconSparkles,
  IconCheck,
  IconHelpCircle,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThinkingOrb } from '@/components/thinking-orb'
import {
  useChatUpdateVoice,
  useVoiceStream,
} from '../query/post-generator.query'

interface VoiceChatPanelProps {
  profileId: string
  history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    appliedPatch?: Record<string, any>
  }>
}

export function VoiceChatPanel({ profileId, history }: VoiceChatPanelProps) {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const chatUpdate = useChatUpdateVoice(profileId)
  const { steps, clearSteps } = useVoiceStream(
    chatUpdate.isPending ? profileId : undefined
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const done = steps.slice(0, -1)
  const current = steps[steps.length - 1]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history.length, chatUpdate.isPending, steps.length])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || chatUpdate.isPending) return

    setInput('')
    setPending(trimmed)
    clearSteps()
    chatUpdate.mutate(trimmed, {
      // The answer arrives as history, so the echo has to survive until that
      // has landed or the message blinks out and back in.
      onSettled: () => setPending(null),
    })
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
        <span className='text-sm font-medium'>Refine voice with AI</span>
      </div>

      <div className='flex-1 overflow-y-auto p-4' ref={scrollRef}>
        {history.length === 0 && !chatUpdate.isPending ? (
          <div className='flex flex-col items-center justify-center gap-2 py-12'>
            <IconSparkles className='text-muted-foreground/40 size-8' />
            <p className='text-muted-foreground text-center text-xs'>
              Tell us how to refine your voice.
              <br />
              Try: "Make me sound more direct" or "Add 'shipping' as a content
              pillar and drop the word synergy"
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {history.map((msg, i) => {
              const isClarification =
                msg.role === 'assistant' && !msg.appliedPatch
              return (
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
                    {msg.role === 'assistant' && (
                      <div className='mb-1 flex items-center gap-1'>
                        {isClarification ? (
                          <IconHelpCircle className='size-3' />
                        ) : (
                          <IconCheck className='size-3 text-emerald-500' />
                        )}
                        <span className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                          {isClarification ? 'Question' : 'Updated'}
                        </span>
                      </div>
                    )}
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
              )
            })}
            {pending && (
              <div className='flex justify-end'>
                <div className='bg-primary text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm'>
                  <p className='whitespace-pre-wrap'>{pending}</p>
                </div>
              </div>
            )}
            {chatUpdate.isPending && (
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
                      {current?.label ?? 'Reading your voice profile'}
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
            placeholder='Tell the AI how to refine your voice...'
            className='max-h-20 min-h-[40px] resize-none text-sm'
            rows={1}
          />
          <Button
            size='icon'
            className='size-9 shrink-0'
            onClick={handleSend}
            disabled={!input.trim() || chatUpdate.isPending}
          >
            <IconSend className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
