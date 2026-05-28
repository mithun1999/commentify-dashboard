import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  IconArrowUp,
  IconLoader2,
  IconSparkles,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateManualPost } from '../query/post-generator.query'
import type { ComposerOutputType } from '../api/post-generator.api'

const PLACEHOLDER =
  'Describe your idea — e.g. "I doubled my pricing from $9 to $19. Here\'s why I almost didn\'t..."'

const OUTPUT_OPTIONS: Array<{ value: ComposerOutputType; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'text_only', label: 'Text only' },
  { value: 'concept_illustration', label: 'Illustration' },
  { value: 'chat_screenshot', label: 'Chat screenshot' },
  { value: 'dashboard_screenshot', label: 'Dashboard screenshot' },
  { value: 'trending_meme', label: 'Trending meme' },
  { value: 'carousel_deck', label: 'Carousel deck' },
]

interface ComposeBannerProps {
  profileId: string
  // Pass calendarId when an active tab is selected. In the empty state
  // pass weekStartDate (current Monday ISO) so the backend find-or-creates.
  calendarId?: string
  weekStartDate?: string
  className?: string
}

export function ComposeBanner({
  profileId,
  calendarId,
  weekStartDate,
  className,
}: ComposeBannerProps) {
  const { agentType } = useParams({ strict: false }) as { agentType: string }
  const navigate = useNavigate()
  const createPost = useCreateManualPost()

  const [idea, setIdea] = useState('')
  const [outputType, setOutputType] = useState<ComposerOutputType>('auto')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-grow the textarea — input starts at a single line and grows up to
  // ~6 rows of content before scrolling internally.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [idea])

  const trimmed = idea.trim()
  const canSubmit = trimmed.length > 0 && !createPost.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    createPost.mutate(
      {
        profileId,
        idea: trimmed,
        outputType,
        ...(calendarId
          ? { calendarId }
          : weekStartDate
            ? { weekStartDate }
            : {}),
      },
      {
        onSuccess: ({ post }) => {
          navigate({
            to: '/agents/$profileId/$agentType/post/$postId' as any,
            params: { profileId, agentType, postId: post._id },
          } as any)
        },
      },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter sends; plain Enter inserts a newline once expanded so
    // the user can paste multi-paragraph context.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={`bg-card relative rounded-xl border p-3 shadow-sm ${className ?? ''}`}
    >
      <div className='flex items-start gap-2'>
        <div className='text-muted-foreground mt-2 shrink-0'>
          <IconSparkles className='size-4' />
        </div>
        <textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          rows={1}
          className='placeholder:text-muted-foreground min-h-[28px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm leading-6 outline-none focus:ring-0'
        />
      </div>

      <div className='mt-2 flex items-center justify-between gap-2 border-t pt-2'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>Output:</span>
          <Select
            value={outputType}
            onValueChange={(v) => setOutputType(v as ComposerOutputType)}
          >
            <SelectTrigger className='h-7 w-[180px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className='text-xs'>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground hidden text-[10px] sm:inline'>
            {/* keyboard hint — meta key glyph differs per platform but ⌘ reads cleanly on macOS and is ignorable elsewhere */}
            ⌘ + ↵ to send
          </span>
          <Button
            size='sm'
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='h-7'
          >
            {createPost.isPending ? (
              <IconLoader2 className='size-3.5 animate-spin' />
            ) : (
              <IconArrowUp className='size-3.5' />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
