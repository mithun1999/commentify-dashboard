import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TimelinePost } from '../api/post-generator.api'
import { usePostTimeline } from '../query/post-generator.query'
import {
  buildMonthGrid,
  currentMonthKey,
  dayKeyInZone,
  dayNumber,
  isToday,
  shiftMonthKey,
  weekdayLabels,
} from '../utils/timeline-date.util'
import { PostChip, PostListRow } from './post-chip'

/** Beyond this a cell stops being readable, so the rest go behind "+N more". */
const MAX_CHIPS_PER_CELL = 3

const FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  {
    value: 'published',
    label: 'Published',
    match: (s: string) => s === 'published',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    match: (s: string) => s === 'scheduled' || s === 'approved',
  },
  {
    value: 'drafts',
    label: 'Drafts',
    match: (s: string) =>
      ['ready', 'generating', 'needs_attention', 'failed'].includes(s),
  },
] as const

type FilterValue = (typeof FILTERS)[number]['value']

export function PostCalendarGrid() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
  }
  const navigate = useNavigate()
  // `month` lives in the URL so opening a post and coming back returns to the
  // same month, mirroring the week view's `week` param.
  const search = useSearch({ strict: false }) as { month?: string }
  const [filter, setFilter] = useState<FilterValue>('all')

  const monthKey = search.month ?? currentMonthKey()

  // The first render has no timezone yet, so the window is built in UTC and
  // rebuilt once the response names the posting zone. The bounds only ever
  // move by hours, and the query is keyed on them, so at worst this is one
  // extra fetch on first load of a non-UTC profile.
  const bootstrapGrid = useMemo(() => buildMonthGrid(monthKey), [monthKey])
  const { data, isPending, isFetching } = usePostTimeline(
    profileId,
    bootstrapGrid.from,
    bootstrapGrid.to
  )

  const timezone = data?.timezone ?? 'UTC'
  const grid = useMemo(
    () => buildMonthGrid(monthKey, timezone),
    [monthKey, timezone]
  )

  const visiblePosts = useMemo(() => {
    const matches = FILTERS.find((f) => f.value === filter)!.match
    return (data?.posts ?? []).filter((p) => matches(p.status))
  }, [data?.posts, filter])

  const postsByDay = useMemo(() => {
    const byDay = new Map<string, TimelinePost[]>()
    for (const post of visiblePosts) {
      const key = dayKeyInZone(post.date, timezone)
      const bucket = byDay.get(key)
      if (bucket) bucket.push(post)
      else byDay.set(key, [post])
    }
    return byDay
  }, [visiblePosts, timezone])

  const setMonth = (next: string) => {
    navigate({
      to: '.',
      search: (prev: { month?: string }) => ({ ...prev, month: next }),
      replace: true,
    })
  }

  const openPost = (post: TimelinePost) => {
    navigate({
      to: '/agents/$profileId/$agentType/post/$postId',
      params: { profileId, agentType, postId: post._id },
      // The editor resolves the post from the active-week window, which does
      // not reach back this far — hand it the calendar directly.
      search: { calendarId: post.calendarId },
    })
  }

  const weekdays = weekdayLabels()

  return (
    <div className='mx-auto max-w-5xl'>
      <div className='mb-4 rounded-xl border'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3'>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              aria-label='Previous month'
              onClick={() => setMonth(shiftMonthKey(monthKey, -1))}
            >
              <IconChevronLeft className='size-4' />
            </Button>
            <h2 className='min-w-40 text-center text-base font-semibold'>
              {grid.label}
            </h2>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              aria-label='Next month'
              onClick={() => setMonth(shiftMonthKey(monthKey, 1))}
            >
              <IconChevronRight className='size-4' />
            </Button>
            {isFetching && !isPending && (
              <IconLoader2 className='text-muted-foreground size-3.5 animate-spin' />
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={monthKey === currentMonthKey(timezone)}
              onClick={() => setMonth(currentMonthKey(timezone))}
            >
              Today
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-1 px-4 py-2'>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type='button'
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
          <span className='text-muted-foreground ml-auto text-xs'>
            {visiblePosts.length}{' '}
            {visiblePosts.length === 1 ? 'post' : 'posts'} &middot; times in{' '}
            {timezone}
          </span>
        </div>
      </div>

      <div className='grid grid-cols-7 gap-px'>
        {weekdays.map((label) => (
          <div
            key={label}
            className='text-muted-foreground pb-2 text-center text-xs font-medium tracking-wide uppercase'
          >
            {label}
          </div>
        ))}
      </div>

      <div className='bg-border grid grid-cols-7 gap-px overflow-hidden rounded-xl border'>
        {grid.days.map((dayKey) => {
          const dayPosts = postsByDay.get(dayKey) ?? []
          const outside = grid.outsideDays.has(dayKey)
          const today = isToday(dayKey, timezone)

          return (
            <div
              key={dayKey}
              className={cn(
                'bg-background flex min-h-24 flex-col gap-1 p-1.5',
                outside && 'bg-muted/40'
              )}
            >
              <div className='flex items-center justify-between'>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    outside
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground',
                    today &&
                      'bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full font-semibold'
                  )}
                >
                  {dayNumber(dayKey)}
                </span>
              </div>

              {isPending ? (
                <Skeleton className='h-4 w-full' />
              ) : (
                <>
                  {dayPosts.slice(0, MAX_CHIPS_PER_CELL).map((post) => (
                    <PostChip
                      key={post._id}
                      post={post}
                      timezone={timezone}
                      onSelect={() => openPost(post)}
                    />
                  ))}

                  {dayPosts.length > MAX_CHIPS_PER_CELL && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type='button'
                          className='text-muted-foreground hover:text-foreground px-1 text-left text-[10px] font-medium'
                        >
                          +{dayPosts.length - MAX_CHIPS_PER_CELL} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align='start' className='w-80 p-0'>
                        <ScrollArea className='max-h-80'>
                          <div className='space-y-2 p-3'>
                            {dayPosts.map((post) => (
                              <PostListRow
                                key={post._id}
                                post={post}
                                timezone={timezone}
                                onSelect={() => openPost(post)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {!isPending && visiblePosts.length === 0 && (
        <div className='flex flex-col items-center justify-center gap-2 py-12'>
          <IconCalendarEvent className='text-muted-foreground/40 size-8' />
          <p className='text-muted-foreground text-sm'>
            {filter === 'all'
              ? 'No posts in this month.'
              : 'No posts match this filter in this month.'}
          </p>
        </div>
      )}
    </div>
  )
}
