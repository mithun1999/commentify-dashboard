import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  IconArrowLeft,
  IconCalendarPlus,
  IconLoader2,
  IconSend,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCreateManualPost } from '../query/post-generator.query'

function charCountColor(count: number) {
  if (count >= 1000 && count <= 1200) return 'text-green-600'
  if (count >= 800 && count <= 1300) return 'text-yellow-600'
  return 'text-red-500'
}

function defaultScheduledAtIso(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Mode = 'schedule' | 'now'

export function ComposePage() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
  }
  const navigate = useNavigate()
  const createPost = useCreateManualPost()

  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => defaultScheduledAtIso())
  const [mode, setMode] = useState<Mode>('schedule')

  const charCount = content.length
  const trimmedContent = content.trim()
  const scheduleInPast = useMemo(() => {
    if (mode !== 'schedule') return false
    const ts = new Date(scheduledAt).getTime()
    return Number.isNaN(ts) || ts <= Date.now()
  }, [mode, scheduledAt])

  const canSubmit =
    trimmedContent.length > 0 &&
    !createPost.isPending &&
    (mode === 'now' || !scheduleInPast)

  const goBack = () => {
    navigate({ to: '/agents/$profileId/$agentType/calendar' as any })
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createPost.mutate(
      {
        profileId,
        content: trimmedContent,
        topic: topic.trim() || undefined,
        publishNow: mode === 'now',
        scheduledAt:
          mode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
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

  return (
    <div className='flex h-full flex-col'>
      <div className='flex shrink-0 items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' className='size-8' onClick={goBack}>
            <IconArrowLeft className='size-4' />
          </Button>
          <h1 className='text-sm font-semibold'>New Post</h1>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='sm' onClick={goBack}>
            Cancel
          </Button>
          <Button size='sm' onClick={handleSubmit} disabled={!canSubmit}>
            {createPost.isPending ? (
              <IconLoader2 className='mr-1.5 size-3.5 animate-spin' />
            ) : mode === 'now' ? (
              <IconSend className='mr-1.5 size-3.5' />
            ) : (
              <IconCalendarPlus className='mr-1.5 size-3.5' />
            )}
            {mode === 'now' ? 'Publish now' : 'Schedule post'}
          </Button>
        </div>
      </div>

      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-auto p-6'>
        <div>
          <label className='text-muted-foreground mb-2 block text-xs font-medium'>
            Topic (optional)
          </label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. Lessons from shipping a side project'
          />
        </div>

        <div className='flex flex-1 flex-col'>
          <label className='text-muted-foreground mb-2 block text-xs font-medium'>
            Post content
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='Write your LinkedIn post...'
            className='min-h-[280px] flex-1 resize-none text-sm leading-relaxed'
          />
          <div className='mt-2 flex items-center gap-3 text-xs'>
            <span className={cn('font-medium', charCountColor(charCount))}>
              {charCount} chars
            </span>
            <Separator orientation='vertical' className='h-4' />
            <span className='text-muted-foreground'>
              LinkedIn sweet spot is 1000-1200 chars
            </span>
          </div>
        </div>

        <div className='rounded-lg border p-4'>
          <p className='mb-3 text-sm font-medium'>When to publish</p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setMode('schedule')}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'schedule'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              Schedule
            </button>
            <button
              type='button'
              onClick={() => setMode('now')}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'now'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              Publish now
            </button>
          </div>

          {mode === 'schedule' && (
            <div className='mt-4'>
              <label className='text-muted-foreground mb-2 block text-xs font-medium'>
                Date and time
              </label>
              <input
                type='datetime-local'
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className='border-input bg-background ring-offset-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2'
              />
              {scheduleInPast && (
                <p className='mt-1.5 text-xs text-red-500'>
                  Pick a time in the future.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
