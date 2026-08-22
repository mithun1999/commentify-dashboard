import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { PostingProgress, PostingStage } from '../api/preview.api'

interface PostingProgressListProps {
  progress: PostingProgress | null | undefined
  /** Shown before the first stage lands, so the list is never empty. */
  fallback: string
}

/**
 * The pipeline in the order it runs, with what each stage is actually doing.
 *
 * Named for the work rather than for the code: "planning" is a real stage in
 * the orchestrator and means nothing to the author, where "working out the
 * shape of the post" is the same second of compute described honestly.
 */
const STAGE_COPY: Record<PostingStage, string> = {
  reading_posts: 'Reading your recent posts',
  learning_voice: 'Working out how you write',
  choosing_idea: 'Picking something worth posting about',
  queued: 'Waiting for a writing slot',
  researching: 'Checking the facts it wants to use',
  planning: 'Working out the shape of the post',
  writing: 'Writing the draft',
  revising: 'Rewriting the weak parts',
  reviewing: 'Reading it back for anything that sounds off',
  drawing_image: 'Drawing the image',
  done: 'Done',
}

const ORDER: PostingStage[] = [
  'reading_posts',
  'learning_voice',
  'choosing_idea',
  'queued',
  'researching',
  'planning',
  'writing',
  'revising',
  'reviewing',
  'drawing_image',
  'done',
]

/**
 * What the posting half of the value screen shows while it works.
 *
 * A post takes a minute or two across three queues, and the screen used to
 * spend it on one unchanging sentence - which is indistinguishable from a hang
 * and is where people close the tab. Every line here is a stage a worker
 * actually announced, and the running clock on the current one is what says
 * the wait is being spent rather than sat out.
 */
export function PostingProgressList({
  progress,
  fallback,
}: PostingProgressListProps) {
  const current = progress?.stage
  const seen = progress?.steps ?? []

  // Stages can be skipped - research is conditional, revising only happens if
  // the critic asks for it - so the list is what was announced plus where it
  // is now, never the full pipeline with speculative ticks against it.
  const done = seen.slice(0, -1).map((step) => step.stage)
  const upNext = current ? nextStage(current) : null

  if (!current) {
    return (
      <p className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Loader2 className='h-4 w-4 animate-spin' />
        {fallback}
      </p>
    )
  }

  return (
    <ol className='space-y-1.5'>
      {done.map((stage, index) => (
        <li
          key={`${stage}-${index}`}
          className='text-muted-foreground flex items-center gap-2 text-sm'
        >
          <Check className='h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400' />
          {STAGE_COPY[stage]}
        </li>
      ))}

      <li className='flex items-center gap-2 text-sm font-medium'>
        <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' />
        <span>{STAGE_COPY[current]}</span>
        <StageClock since={progress?.at} />
      </li>

      {upNext && (
        <li className='text-muted-foreground/50 flex items-center gap-2 text-sm'>
          <span className='bg-muted-foreground/30 h-1.5 w-1.5 shrink-0 rounded-full' />
          {STAGE_COPY[upNext]}
        </li>
      )}
    </ol>
  )
}

/**
 * `queued` and `drawing_image` are the two stages long enough that a still
 * screen reads as broken, and both are the ones we can say least about. A
 * second counter is the smallest honest thing that moves.
 */
function StageClock({ since }: { since?: string }) {
  const [seconds, setSeconds] = useState(() => elapsed(since))

  useEffect(() => {
    setSeconds(elapsed(since))
    const timer = setInterval(() => setSeconds(elapsed(since)), 1000)
    return () => clearInterval(timer)
  }, [since])

  if (seconds < 3) return null
  return (
    <span className='text-muted-foreground text-xs font-normal tabular-nums'>
      {seconds}s
    </span>
  )
}

function elapsed(since?: string): number {
  if (!since) return 0
  const started = new Date(since).getTime()
  if (Number.isNaN(started)) return 0
  return Math.max(0, Math.round((Date.now() - started) / 1000))
}

function nextStage(current: PostingStage): PostingStage | null {
  const index = ORDER.indexOf(current)
  if (index < 0 || index >= ORDER.length - 1) return null
  const next = ORDER[index + 1]
  // Promising the finish is not a step; the draft appearing says that.
  return next === 'done' ? null : next
}
