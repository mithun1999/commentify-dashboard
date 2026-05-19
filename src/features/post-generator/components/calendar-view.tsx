import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  IconCalendarPlus,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconCalendarEvent,
  IconAlertTriangle,
  IconPlus,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useActiveCalendars,
  useGenerateCalendar,
  useScheduleAll,
} from '../query/post-generator.query'
import { PostCard } from './post-card'

function formatWeekRange(dateStr: string) {
  const start = new Date(dateStr)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', yearOpts)}`
}

function formatWeekTabRange(dateStr: string) {
  const start = new Date(dateStr)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDayHeader(weekStart: string, dayIndex: number) {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + dayIndex)
  const dayName = DAY_NAMES[date.getDay()]
  return `${dayName} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'generating':
      return 'secondary'
    case 'reviewing':
      return 'outline'
    case 'scheduled':
      return 'default'
    case 'completed':
      return 'default'
    default:
      return 'outline'
  }
}

export function CalendarView() {
  const { profileId, agentType } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
  }
  const navigate = useNavigate()
  const { data: weeks, isPending } = useActiveCalendars(profileId)
  const generateCalendar = useGenerateCalendar()
  const scheduleAll = useScheduleAll()
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)

  const needsOnboarding =
    generateCalendar.isError &&
    (generateCalendar.error as any)?.message
      ?.toLowerCase()
      ?.includes('onboarding')

  const weekList = useMemo(() => (weeks as any[]) ?? [], [weeks])

  const activeWeek = weekList[activeWeekIndex] ?? null
  const calendar = activeWeek?.calendar
  const posts: any[] = activeWeek?.posts ?? []

  const scheduledCount = posts.filter(
    (p) =>
      p.status === 'approved' ||
      p.status === 'scheduled' ||
      p.status === 'published'
  ).length
  const readyCount = posts.filter((p) => p.status === 'ready').length

  const postsByDay = posts.reduce(
    (acc: Record<number, any[]>, post: any) => {
      const dayIdx = post.slotIndex ?? 0
      if (!acc[dayIdx]) acc[dayIdx] = []
      acc[dayIdx].push(post)
      return acc
    },
    {} as Record<number, any[]>
  )

  const nextWeekOffset = weekList.length
  const canGenerateNext = weekList.length < 4

  if (isPending) {
    return (
      <div className='mx-auto max-w-3xl'>
        <div className='mb-4 flex items-center gap-2'>
          <Skeleton className='h-8 w-32 rounded-md' />
          <Skeleton className='h-8 w-32 rounded-md' />
        </div>
        <div className='mb-6 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-7 w-56' />
            <Skeleton className='h-5 w-16 rounded-full' />
          </div>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-36 rounded-md' />
            <Skeleton className='h-8 w-28 rounded-md' />
          </div>
        </div>
        <div className='space-y-6'>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className='mb-3 h-4 w-28' />
              <div className='rounded-xl border p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-5 w-16 rounded-full' />
                    <Skeleton className='h-5 w-20 rounded-full' />
                  </div>
                  <Skeleton className='h-5 w-12 rounded-full' />
                </div>
                <Skeleton className='mb-2 h-4 w-full' />
                <Skeleton className='mb-2 h-4 w-4/5' />
                <Skeleton className='h-4 w-3/5' />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (weekList.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-20'>
        {needsOnboarding ? (
          <>
            <div className='bg-amber-100 flex size-16 items-center justify-center rounded-full dark:bg-amber-900/30'>
              <IconAlertTriangle className='size-8 text-amber-600 dark:text-amber-400' />
            </div>
            <div className='text-center'>
              <h3 className='text-lg font-semibold'>Voice Analysis Required</h3>
              <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
                Run voice analysis in Settings first to extract your writing
                style, content pillars, and posting cadence.
              </p>
            </div>
            <Button
              onClick={() =>
                navigate({
                  to: `/agents/$profileId/$agentType/settings` as string,
                  params: { profileId, agentType },
                })
              }
            >
              Go to Settings
            </Button>
          </>
        ) : (
          <>
            <div className='bg-muted flex size-16 items-center justify-center rounded-full'>
              <IconCalendarEvent className='text-muted-foreground size-8' />
            </div>
            <div className='text-center'>
              <h3 className='text-lg font-semibold'>No Content Calendar</h3>
              <p className='text-muted-foreground mt-1 text-sm'>
                Generate your first weekly content calendar to get started.
              </p>
            </div>
            <Button
              onClick={() =>
                generateCalendar.mutate({ profileId, weekOffset: 0 })
              }
              disabled={generateCalendar.isPending}
            >
              {generateCalendar.isPending ? (
                <IconLoader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <IconCalendarPlus className='mr-2 size-4' />
              )}
              Generate Calendar
            </Button>
          </>
        )}
      </div>
    )
  }

  const sortedDayKeys = Object.keys(postsByDay)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className='mx-auto max-w-3xl'>
      {calendar && (
        <>
          {/* Week navigation */}
          <div className='mb-6 rounded-xl border'>
            <div className='flex items-center justify-between border-b px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  disabled={activeWeekIndex === 0}
                  onClick={() => setActiveWeekIndex((i) => Math.max(0, i - 1))}
                >
                  <IconChevronLeft className='size-4' />
                </Button>
                <h2 className='text-base font-semibold'>
                  {formatWeekRange(calendar.weekStartDate)}
                </h2>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  disabled={activeWeekIndex >= weekList.length - 1}
                  onClick={() =>
                    setActiveWeekIndex((i) => Math.min(weekList.length - 1, i + 1))
                  }
                >
                  <IconChevronRight className='size-4' />
                </Button>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => scheduleAll.mutate(calendar._id)}
                  disabled={scheduleAll.isPending || readyCount === 0}
                >
                  {scheduleAll.isPending && (
                    <IconLoader2 className='mr-2 size-3.5 animate-spin' />
                  )}
                  Approve & Schedule All
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() =>
                    generateCalendar.mutate({ profileId, weekOffset: activeWeekIndex })
                  }
                  disabled={generateCalendar.isPending}
                >
                  {generateCalendar.isPending ? (
                    <IconLoader2 className='mr-2 size-3.5 animate-spin' />
                  ) : (
                    <IconCalendarPlus className='mr-2 size-3.5' />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>

            <div className='flex items-center gap-1 px-4 py-2'>
              {weekList.map((w: any, idx: number) => {
                const isActive = idx === activeWeekIndex
                return (
                  <button
                    key={w.calendar._id}
                    type='button'
                    onClick={() => setActiveWeekIndex(idx)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {formatWeekTabRange(w.calendar.weekStartDate)}
                  </button>
                )
              })}
              {canGenerateNext && (
                <button
                  type='button'
                  onClick={() =>
                    generateCalendar.mutate({ profileId, weekOffset: nextWeekOffset })
                  }
                  disabled={generateCalendar.isPending}
                  className='text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50'
                >
                  {generateCalendar.isPending ? (
                    <IconLoader2 className='size-3 animate-spin' />
                  ) : (
                    <IconPlus className='size-3' />
                  )}
                  Add week
                </button>
              )}
            </div>

            <div className='flex items-center gap-3 border-t px-4 py-2'>
              <Badge variant={statusBadgeVariant(calendar.status)} className='text-[11px]'>
                {calendar.status}
              </Badge>
              <span className='text-muted-foreground text-xs'>
                {posts.length} posts &middot; {scheduledCount} scheduled &middot; {readyCount} ready
              </span>
            </div>
          </div>

          <div className='space-y-6'>
            {sortedDayKeys.map((dayIdx) => (
              <div key={dayIdx}>
                <h3 className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
                  {formatDayHeader(calendar.weekStartDate, dayIdx)}
                </h3>
                <div className='space-y-3'>
                  {postsByDay[dayIdx].map((post: any) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      calendarId={calendar._id}
                      onClick={() =>
                        navigate({
                          to: '/agents/$profileId/$agentType/post/$postId',
                          params: { profileId, agentType, postId: post._id },
                        } as any)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {calendar.status === 'generating' && posts.length === 0 && (
            <div className='flex flex-col items-center gap-3 py-16'>
              <IconLoader2 className='text-muted-foreground size-8 animate-spin' />
              <p className='text-muted-foreground text-sm'>
                Generating your content calendar...
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
