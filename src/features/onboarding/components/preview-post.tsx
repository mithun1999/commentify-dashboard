import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  Loader2,
  PenLine,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getPostingPreview,
  prewarmPostingPreview,
  type PostingPreview,
} from '../api/preview.api'
import { useIsClamped } from '../hooks/useIsClamped'
import { useTypewriter } from '../hooks/useTypewriter'
import { PostingProgressList } from './posting-progress'

interface PreviewPostProps {
  profileId: string | undefined
  /** Comment-only users see an offer instead; the draft is built on click. */
  wantsPost: boolean
}

/**
 * Fast enough that a stage change is on screen within a couple of seconds of
 * the worker announcing it. The endpoint is two indexed reads and a Redis get,
 * and this only runs while an onboarding preview is in flight.
 */
const POLL_MS = 2500

/**
 * Measured end to end this is around ten minutes: roughly 1.5 reading the
 * author's posts, 1.5 waiting for the draft queue, 2.5 writing, and 4 on the
 * image. The old three-minute limit expired while the draft was still being
 * written, so the screen called a working pipeline dead. This is that ten with
 * room for a slow queue - past it the job really is gone, and an honest dead
 * end beats a spinner that never stops.
 */
const STALL_AFTER_MS = 12 * 60 * 1000

/**
 * Every format the preview can roll ships with an illustration, so a post that
 * has gone `ready` with nothing in `media` is still mid-pipeline: the text and
 * the image are written by different queues and the image lands minutes later.
 */
const ILLUSTRATED_OUTPUT_TYPES = new Set([
  'concept_illustration',
  'chat_screenshot',
  'dashboard_screenshot',
  'trending_meme',
  'handwritten_note',
  'carousel_deck',
])

function awaitingImage(preview: PostingPreview | undefined): boolean {
  const post = preview?.post
  if (!post) return false
  if (!ILLUSTRATED_OUTPUT_TYPES.has(post.outputType ?? '')) return false
  return !post.media?.some((m) => m.type === 'image')
}

/**
 * The posting half of the value screen. For declared posters the draft is
 * already being built (pre-warmed at connect) so this only polls. Comment-only
 * users get an offer, and the minute of work starts when they take it.
 */
export function PreviewPost({ profileId, wantsPost }: PreviewPostProps) {
  const [optedIn, setOptedIn] = useState(wantsPost)
  const [requesting, setRequesting] = useState(false)
  const [stalled, setStalled] = useState(false)
  const startedAt = useRef<number | null>(null)

  const { data, refetch } = useQuery({
    queryKey: ['onboarding-posting-preview', profileId],
    queryFn: () => getPostingPreview(profileId as string),
    enabled: !!profileId && optedIn && !stalled,
    refetchInterval: (query) => {
      const preview = query.state.data as PostingPreview | undefined
      if (preview?.phase === 'failed') return false
      // Stopping the moment the text is written is what left an illustrated
      // format showing no illustration until the user reloaded the page.
      if (preview?.phase === 'ready')
        return awaitingImage(preview) ? POLL_MS : false
      return POLL_MS
    },
  })

  // The pre-warm is fire-and-forget at connect, but a user who lands here
  // straight after a reload may have missed it - asking again is a no-op when
  // a draft already exists.
  useEffect(() => {
    if (!profileId || !optedIn) return
    prewarmPostingPreview({ profileId }).catch(() => {})
  }, [profileId, optedIn])

  const pendingImage = awaitingImage(data)
  const settled =
    data?.phase === 'failed' || (data?.phase === 'ready' && !pendingImage)

  useEffect(() => {
    if (!optedIn || stalled || settled) return
    startedAt.current ??= Date.now()
    const remaining = STALL_AFTER_MS - (Date.now() - startedAt.current)
    const timer = setTimeout(() => setStalled(true), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [optedIn, stalled, settled])

  const handleOptIn = async () => {
    if (!profileId) return
    setRequesting(true)
    try {
      await prewarmPostingPreview({ profileId })
      setOptedIn(true)
      void refetch()
    } finally {
      setRequesting(false)
    }
  }

  // Without `regenerate` this reads the abandoned attempt straight back and
  // resumes polling a draft nobody is writing, which is the same dead end the
  // button is meant to escape.
  const handleRetry = async () => {
    if (!profileId) return
    setRequesting(true)
    try {
      await prewarmPostingPreview({ profileId, regenerate: true })
      startedAt.current = Date.now()
      setStalled(false)
      void refetch()
    } finally {
      setRequesting(false)
    }
  }

  const image = useMemo(
    () => data?.post?.media?.find((m) => m.type === 'image'),
    [data]
  )

  // The draft is polled, so it lands as one finished block after minutes of a
  // spinner. Typing it out is what makes those minutes read as writing.
  const {
    shown: typedDraft,
    done: draftTyped,
    finish: finishDraft,
  } = useTypewriter(data?.post?.content)

  // Printed in full this draft ran to eleven paragraphs and pushed the rest of
  // the screen - including the trial ask - most of a scroll further down. The
  // collapsed height is a taste of the voice, which is all this has to prove.
  const [expanded, setExpanded] = useState(false)
  // Measured against what is on screen rather than the full draft: offering
  // "See more" while the text is still arriving cuts off writing the user can
  // see is still going.
  const { ref: draftRef, clamped } = useIsClamped<HTMLParagraphElement>(
    typedDraft
  )

  // Once the text overflows the clamp the caret is below the fold, so the rest
  // of the typing is invisible - it only holds back "See more" for the seconds
  // it takes to finish writing off screen.
  useEffect(() => {
    if (clamped && !expanded) finishDraft()
  }, [clamped, expanded, finishDraft])

  if (!optedIn) {
    return (
      <div className='rounded-lg border border-dashed p-4'>
        <div className='flex items-start gap-3'>
          <PenLine className='text-muted-foreground mt-0.5 h-5 w-5 shrink-0' />
          <div className='space-y-2'>
            <p className='text-sm font-medium'>
              Want it to write your posts too?
            </p>
            <p className='text-muted-foreground text-sm'>
              We read how you already write and draft a post in your voice,
              image included. Takes about a minute.
            </p>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={handleOptIn}
              disabled={requesting}
            >
              {requesting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Starting&hellip;
                </>
              ) : (
                'Write me one'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const phase = data?.phase ?? 'voice'
  const postsAnalyzed = data?.postsAnalyzed
  const noOwnPosts = postsAnalyzed === 0
  const hasDraft = !!data?.post?.content

  // A written draft outranks both failure states. Running out of patience on
  // an image is not the same as the draft not finishing, and telling someone
  // their post "did not finish" above the post itself reads as a bug.
  if ((phase === 'failed' || stalled) && !hasDraft) {
    return (
      <div className='space-y-3 rounded-lg border p-4'>
        <p className='text-sm font-medium'>
          Your post draft did not finish this time
        </p>
        <p className='text-muted-foreground text-sm'>
          Your commenting agent is unaffected, and you can write one from the
          dashboard whenever you like.
        </p>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={handleRetry}
          disabled={requesting}
        >
          {requesting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='mr-2 h-3.5 w-3.5' />
          )}
          Try again
        </Button>
      </div>
    )
  }

  if (!hasDraft) {
    return (
      <div className='rounded-lg border p-4'>
        {/* Naming the stage it is actually on is what makes a long wait read
            as work rather than a hang: this is the same pipeline that writes
            the daily post, not a preview shortcut, and it takes what it
            takes. */}
        <PostingProgressList
          progress={data?.progress}
          fallback={
            noOwnPosts
              ? 'No posts on this profile yet. Drafting from your About section instead\u2026'
              : phase === 'voice'
                ? 'Reading your recent posts to learn how you write\u2026'
                : 'Writing a post in your voice\u2026'
          }
        />
        {data?.toneDescription &&
          data.toneDescription !== 'Not enough posts to analyze' && (
            <p className='text-muted-foreground mt-3 text-xs'>
              {data.toneDescription}
            </p>
          )}
        {/* A single line of text held still for minutes reads as a hang. The
            outline of the post being assembled reads as work in progress. */}
        <div className='mt-4 space-y-2' aria-hidden>
          <Skeleton className='h-3 w-full' />
          <Skeleton className='h-3 w-[92%]' />
          <Skeleton className='h-3 w-[78%]' />
        </div>

        {/* The image is drawn from the idea rather than the finished draft, so
            it can and does land first. Holding it back until there are words
            to sit above buys nothing but a longer blank screen. */}
        {image ? (
          <img
            src={image.url}
            alt='Generated illustration for the draft post'
            className='mx-auto mt-3 max-h-[22rem] max-w-full rounded-md border'
          />
        ) : (
          <Skeleton className='mt-3 h-24 w-full' />
        )}
      </div>
    )
  }

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center gap-2'>
        <Sparkles className='h-4 w-4 text-violet-500' />
        <span className='text-sm font-medium'>
          A post written in your voice
        </span>
        {data?.post?.isCarousel && (
          <span className='rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300'>
            Pro
          </span>
        )}
      </div>

      {noOwnPosts && (
        <p className='text-muted-foreground text-xs'>
          This profile has no posts yet, so the draft is based on your About
          section. After you publish a few times — or add creators in settings —
          later drafts will match a real writing style.
        </p>
      )}

      <div>
        <p
          ref={draftRef}
          className={`text-sm whitespace-pre-wrap ${expanded ? '' : 'line-clamp-6'}`}
        >
          {typedDraft}
          {!draftTyped && (
            <span className='bg-foreground ml-0.5 inline-block h-3.5 w-[2px] animate-pulse align-middle' />
          )}
        </p>
        {draftTyped && (clamped || expanded) && (
          <button
            type='button'
            onClick={() => setExpanded((prev) => !prev)}
            className='text-primary mt-1 text-xs font-medium hover:underline'
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>

      {image ? (
        <img
          src={image.url}
          alt='Generated illustration for the draft post'
          className='mx-auto max-h-[22rem] max-w-full rounded-md border'
        />
      ) : pendingImage ? (
        // Showing the words the moment they exist turns the image wait from
        // dead time into a second thing arriving, rather than making the
        // author stare at a spinner for minutes with nothing to read. The
        // placeholder takes the shape the image will fill so nothing jumps
        // when it lands.
        <div className='relative flex h-56 items-center justify-center overflow-hidden rounded-md border bg-gradient-to-br from-violet-50 via-fuchsia-50 to-sky-50 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-sky-950/40'>
          <div className='animate-image-sweep absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10' />
          <div className='text-muted-foreground relative flex flex-col items-center gap-2 text-xs'>
            <ImageIcon className='h-6 w-6 animate-pulse text-violet-400' />
            Drawing the image for this post&hellip;
          </div>
        </div>
      ) : null}

      {data?.post?.isCarousel && (
        <p className='text-muted-foreground text-xs'>
          Carousels are part of the Pro plan. Your draft is saved either way.
        </p>
      )}
    </div>
  )
}
