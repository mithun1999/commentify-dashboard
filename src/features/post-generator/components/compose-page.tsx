import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  IconArrowLeft,
  IconLoader2,
  IconSparkles,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateManualPost } from '../query/post-generator.query'

const IDEA_PLACEHOLDER = `e.g. Lessons from migrating off Postgres at 3am — the part that scared me was not the data but the team's morale. Three things saved us...`

function defaultScheduledAtIso(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ComposePage() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
  }
  const navigate = useNavigate()
  const createPost = useCreateManualPost()

  const [idea, setIdea] = useState('')
  const [topic, setTopic] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => defaultScheduledAtIso())

  const trimmedIdea = idea.trim()
  const scheduleInPast = useMemo(() => {
    const ts = new Date(scheduledAt).getTime()
    return Number.isNaN(ts) || ts <= Date.now()
  }, [scheduledAt])

  const canSubmit =
    trimmedIdea.length > 0 && !scheduleInPast && !createPost.isPending

  const goBack = () => {
    navigate({
      to: '/agents/$profileId/$agentType/calendar' as any,
      params: { profileId, agentType },
    } as any)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createPost.mutate(
      {
        profileId,
        idea: trimmedIdea,
        topic: topic.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
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
            ) : (
              <IconSparkles className='mr-1.5 size-3.5' />
            )}
            Generate draft
          </Button>
        </div>
      </div>

      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-auto p-6'>
        <div>
          <h2 className='text-base font-semibold'>What's on your mind?</h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            Share the idea, story, or angle. Our writer will draft it in your
            voice. You'll be able to edit and chat with the AI to refine it
            before it ships.
          </p>
        </div>

        <div className='flex flex-1 flex-col'>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={IDEA_PLACEHOLDER}
            className='min-h-[260px] flex-1 resize-none text-sm leading-relaxed'
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            Rough notes are fine — bullets, half-sentences, the punchline you
            already have. The more specific the better.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div>
            <label className='text-muted-foreground mb-2 block text-xs font-medium'>
              Topic (optional)
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='Short title for this post'
            />
          </div>
          <div>
            <label className='text-muted-foreground mb-2 block text-xs font-medium'>
              Schedule for
            </label>
            <input
              type='datetime-local'
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className='border-input bg-background ring-offset-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2'
            />
            {scheduleInPast && (
              <p className='mt-1.5 text-xs text-red-500'>
                Pick a time in the future.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
