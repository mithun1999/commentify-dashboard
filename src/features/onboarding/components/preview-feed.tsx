import { Link } from '@tanstack/react-router'
import {
  Check,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { REJECTION_COPY } from '../api/preview.api'
import type { DerivationPhase } from '../hooks/useDeriveOnboardingSettings'
import type { FeedNote, FeedRow } from '../hooks/usePreviewRun'
import { useTypewriter } from '../hooks/useTypewriter'

export type PreviewMode = 'sales' | 'branding'

interface PreviewFeedProps {
  rows: FeedRow[]
  /** Lines about the run rather than about a post - searching, results in. */
  notes: FeedNote[]
  keyword: string | null
  /** Posts LinkedIn has returned so far, across every search. */
  scrapedCount: number
  /** Of those, how many have been judged. Trails `scrapedCount` while running. */
  analysedCount: number
  keptCount: number
  rejectedCount: number
  running: boolean
  /** True while targeting is still being worked out, before any search. */
  preparing: boolean
  derivationPhase: DerivationPhase
  derivedKeywords: string[]
  /** The search never returned - an outage on our side, not a verdict. */
  unreachable: boolean
  /** The LinkedIn session expired, which only the user can put right. */
  needsReconnect: boolean
  mode: PreviewMode
  onRetry?: () => void
}

/**
 * A sales agent and a branding agent turn down the same feed for different
 * reasons, so an empty result means different things. "No posts matched" tells
 * a seller nothing; "nobody was describing a problem you solve" tells them the
 * agent understood the job and the window was just too small.
 */
const EMPTY_COPY: Record<
  PreviewMode,
  { title: string; body: (read: number) => string }
> = {
  sales: {
    title: 'Nobody worth pitching to in this sample',
    body: (read) =>
      `${effortSoFar(read)} and nobody who came back was describing a problem you solve, so there was no opening to promote what you do without it reading as spam. It skipped them rather than force one.`,
  },
  branding: {
    title: 'Nothing worth replying to in this sample',
    body: (read) =>
      `${effortSoFar(read)} and nothing that came back was a conversation worth adding your take to, so it skipped them rather than pad the feed with filler.`,
  },
}

/**
 * An empty result is only believable if the user can see what was spent
 * reaching it. "It read 23 posts" is a verdict they can weigh; "it went through
 * your keywords" is a claim they cannot, and reads like nothing happened.
 */
const effortSoFar = (read: number) =>
  read > 0
    ? `It read ${read} post${read === 1 ? '' : 's'}`
    : 'It went through your keywords'

/**
 * The preview is deliberately small - a handful of keywords, a few posts each,
 * and it stops as soon as it has enough to show. Saying so is the difference
 * between "your topics are dead" and "we barely looked yet".
 *
 * It no longer claims the daily run searches wider. The opposite is now true:
 * this pass reads all of LinkedIn to find the clearest examples, where the
 * daily run reads the last day so the comment lands while the post is live.
 */
const NARROW_SLICE_NOTE =
  'This is a quick sample, not the real thing: it tries a few of your keywords and stops early. The daily run works through your full list and goes deeper into each one, on the posts published that day.'

/**
 * The wait is 60-90 seconds of scraping and judging, which is long enough that
 * a spinner reads as broken. Showing the actual verdicts makes the wait the
 * demonstration: the user watches it turn work down for reasons they agree with.
 *
 * The empty screen has two causes that look identical and read completely
 * differently: the agent read the feed and passed, or it never got to read
 * anything. Telling someone their topics were not worth commenting on when we
 * simply could not reach LinkedIn is the worst first impression the product
 * can make, so the two are kept strictly apart.
 */
export function PreviewFeed({
  rows,
  notes,
  keyword,
  scrapedCount,
  analysedCount,
  keptCount,
  rejectedCount,
  running,
  preparing,
  derivationPhase,
  derivedKeywords,
  unreachable,
  needsReconnect,
  mode,
  onRetry,
}: PreviewFeedProps) {
  const empty = rows.length === 0

  if (preparing) {
    return <SetupFeed phase={derivationPhase} keywords={derivedKeywords} />
  }

  if (!running && needsReconnect) {
    return (
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30'>
        <div className='flex items-start gap-3'>
          <LinkIcon className='mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400' />
          <div className='space-y-2'>
            <p className='text-sm font-medium text-amber-900 dark:text-amber-200'>
              Your LinkedIn session expired
            </p>
            <p className='text-sm text-amber-800 dark:text-amber-300'>
              LinkedIn signed the connection out, so the agent cannot search on
              your behalf until it is reconnected. Everything else you set up is
              saved.
            </p>
            <Button type='button' size='sm' variant='outline' asChild>
              <Link to='/onboarding/connect-account'>Reconnect LinkedIn</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!running && unreachable) {
    return (
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30'>
        <div className='flex items-start gap-3'>
          <WifiOff className='mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400' />
          <div className='space-y-2'>
            <p className='text-sm font-medium text-amber-900 dark:text-amber-200'>
              We could not reach LinkedIn just now
            </p>
            <p className='text-sm text-amber-800 dark:text-amber-300'>
              This one is on us, not on your setup — the search never ran, so
              there is nothing to judge yet. Your agent is saved and will try
              again tomorrow either way.
            </p>
            {onRetry && (
              <Button type='button' size='sm' variant='outline' onClick={onRetry}>
                <RefreshCw className='mr-2 h-3.5 w-3.5' />
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!running && empty) {
    return (
      <div className='rounded-lg border p-4'>
        <p className='text-sm font-medium'>{EMPTY_COPY[mode].title}</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          {EMPTY_COPY[mode].body(analysedCount)}
        </p>
        <p className='text-muted-foreground mt-2 text-sm'>
          {NARROW_SLICE_NOTE}
        </p>
        {onRetry ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='mt-3'
            onClick={onRetry}
          >
            <RefreshCw className='mr-2 h-3.5 w-3.5' />
            Search again
          </Button>
        ) : (
          <p className='text-muted-foreground mt-2 text-sm'>
            That was the live sample this preview gets. Running these same
            keywords again would read the same results, so the next real
            attempt is tomorrow&apos;s run.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          {running ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Search className='h-4 w-4' />
          )}
          {running ? (
            keyword ? (
              <span>
                Searching LinkedIn for comments on{' '}
                <span className='text-foreground font-medium'>{keyword}</span>
              </span>
            ) : (
              <span>Looking for posts to comment on&hellip;</span>
            )
          ) : (
            <span>Finished finding posts to comment on</span>
          )}
        </div>
        <div className='flex items-center gap-3 text-xs'>
          {/*
            The one number that moves on its own during the judging gap. Kept
            and skipped only start climbing once verdicts land, so on their own
            they leave the longest part of the run reading as a stalled screen.
          */}
          {scrapedCount > 0 && (
            <span className='text-muted-foreground tabular-nums'>
              {analysedCount} of {scrapedCount} read
            </span>
          )}
          <span className='flex items-center gap-1 text-green-600 dark:text-green-400'>
            <Check className='h-3.5 w-3.5' />
            {keptCount} kept
          </span>
          <span className='text-muted-foreground flex items-center gap-1'>
            <X className='h-3.5 w-3.5' />
            {rejectedCount} skipped
          </span>
        </div>
      </div>

      <div className='divide-border max-h-72 divide-y overflow-y-auto rounded-lg border'>
        {/*
          The notes sit above the verdicts rather than being merged into one
          list by time. Verdicts are the point of this screen and a scrolling
          box that pushes them under a running commentary buries them; the
          newest note on top is where the eye already is while waiting.
        */}
        {notes.map((note) => (
          <NoteLine key={note.id} note={note} />
        ))}
        {empty && notes.length === 0 && (
          // Deliberately not the header's sentence again. Two identical lines
          // stacked on each other is what an empty screen looks like when it
          // has nothing to say, which is the impression this is here to avoid.
          <div className='text-muted-foreground p-4 text-sm'>
            Every post it reads will appear here, kept or skipped, as it
            decides.
          </div>
        )}
        {rows.map((row) => (
          <FeedLine key={row.id} row={row} />
        ))}
      </div>
    </div>
  )
}

/**
 * The wait before the search: reading the profile, then checking the keywords
 * it produced against real searches. It used to happen on the connect screen
 * behind its own spinner, which meant this screen opened on an empty feed with
 * nothing to say for the first half-minute of a run it had already started.
 */
function SetupFeed({
  phase,
  keywords,
}: {
  phase: DerivationPhase
  keywords: string[]
}) {
  const steps: { key: DerivationPhase; label: string }[] = [
    { key: 'reading', label: 'Reading your profile' },
    { key: 'checking', label: 'Checking which topics surface real posts' },
    { key: 'ready', label: 'Saving what to look for' },
  ]
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === phase)
  )

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Working out what your agent should look for
      </div>

      <ol className='space-y-1.5'>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`flex items-center gap-2 text-sm ${
              index <= activeIndex ? '' : 'text-muted-foreground/50'
            }`}
          >
            {index < activeIndex ? (
              <Check className='h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400' />
            ) : index === activeIndex ? (
              <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' />
            ) : (
              <span className='bg-muted-foreground/30 h-1.5 w-1.5 shrink-0 rounded-full' />
            )}
            {step.label}
          </li>
        ))}
      </ol>

      {keywords.length > 0 && (
        <div className='space-y-1.5'>
          <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Sparkles className='h-3.5 w-3.5 text-violet-500' />
            Topics so far
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {keywords.map((word) => (
              <span
                key={word}
                className='bg-muted rounded-full px-2.5 py-1 text-xs font-medium'
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function noteLabel(note: FeedNote) {
  switch (note.kind) {
    case 'queued':
      return <>Waiting for a slot, {ordinal(note.count ?? 0)} in the queue</>
    case 'starting':
      return <>Opening LinkedIn and loading your topics</>
    case 'retrying':
      // Named as LinkedIn's problem because it is, and because the alternative
      // reading - that their account or setup is broken - is both wrong and
      // the one a new user reaches for first.
      return (
        <>
          LinkedIn did not answer{' '}
          {note.attempt && note.attempts
            ? `(attempt ${note.attempt} of ${note.attempts})`
            : null}{' '}
          — starting the search again
        </>
      )
    case 'searching':
      return (
        <>
          Searching LinkedIn for{' '}
          <span className='text-foreground font-medium'>{note.keyword}</span>
        </>
      )
    default:
      return (
        <>
          Found {note.count} post{note.count === 1 ? '' : 's'} for{' '}
          <span className='text-foreground font-medium'>{note.keyword}</span> —
          reading {note.count === 1 ? 'it' : 'them'} now
        </>
      )
  }
}

const ordinal = (n: number) => {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

function NoteLine({ note }: { note: FeedNote }) {
  const retrying = note.kind === 'retrying'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-xs ${
        retrying
          ? 'text-amber-800 dark:text-amber-300'
          : 'text-muted-foreground'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          retrying
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
            : 'bg-muted'
        }`}
      >
        {note.kind === 'searching' ? (
          <Search className='h-3 w-3' />
        ) : retrying ? (
          <RefreshCw className='h-3 w-3' />
        ) : (
          <Loader2 className='h-3 w-3 animate-spin' />
        )}
      </span>
      <span className='min-w-0 flex-1 truncate'>{noteLabel(note)}</span>
    </div>
  )
}

function FeedLine({ row }: { row: FeedRow }) {
  // The verdict lands first and the comment seconds later, so a kept row is
  // watched twice. Typing the second arrival is what makes the row read as the
  // agent writing rather than as a row quietly swapping its contents.
  const { shown: typedComment, done: commentTyped } = useTypewriter(row.comment)

  return (
    <div className='flex gap-3 p-3'>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          row.kept
            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {row.kept ? <Check className='h-3 w-3' /> : <X className='h-3 w-3' />}
      </span>

      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='truncate text-sm font-medium'>
            {row.authorName || 'Someone on LinkedIn'}
          </span>
          {!row.kept && row.reason && (
            <span className='text-muted-foreground shrink-0 text-xs'>
              {REJECTION_COPY[row.reason]}
            </span>
          )}
        </div>
        {row.excerpt && (
          <p className='text-muted-foreground mt-0.5 line-clamp-2 text-xs'>
            {row.excerpt}
          </p>
        )}
        {row.kept && row.comment && (
          <p className='mt-1.5 rounded bg-violet-50 px-2 py-1.5 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-200'>
            {typedComment}
            {!commentTyped && (
              <span className='ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-violet-500 align-middle' />
            )}
          </p>
        )}
      </div>
    </div>
  )
}
