import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
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
  useCalendarStream,
  useGenerateCalendar,
  useScheduleAll,
} from '../query/post-generator.query'
import { PostCard } from './post-card'
import { GenerateCalendarDialog } from './generate-calendar-dialog'
import { ComposeBanner } from './compose-banner'
import type { CalendarUserContextInput } from '../api/post-generator.api'

// ISO yyyy-mm-dd Monday for "this week" — used as the empty-state composer's
// weekStartDate fallback when no calendar exists yet for the profile. Local
// timezone matches the backend's weekStartFor() helper.
function currentMondayIso(): string {
  const d = new Date()
  const day = d.getDay()
  const offsetToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offsetToMonday)
  d.setHours(0, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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

function bucketDayIndex(post: any, weekStartDate?: string): number {
  if (post?.scheduledAt && weekStartDate) {
    const ms =
      new Date(post.scheduledAt).getTime() - new Date(weekStartDate).getTime()
    const idx = Math.floor(ms / (24 * 60 * 60 * 1000))
    return Math.max(0, Math.min(6, idx))
  }
  return post?.slotIndex ?? 0
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
  // `week` lives in the URL so navigating into a post and clicking back
  // restores the same tab. `strict: false` because this component is
  // also rendered from non-calendar contexts during onboarding loaders.
  const search = useSearch({ strict: false }) as { week?: number }
  const { data: weeks, isPending } = useActiveCalendars(profileId)
  const generateCalendar = useGenerateCalendar()
  const scheduleAll = useScheduleAll()
  const [pendingWeekOffset, setPendingWeekOffset] = useState<number | null>(null)

  const weekList = useMemo(() => (weeks as any[]) ?? [], [weeks])

  // Clamp the URL value to the available range — protects against stale
  // links pointing at a week that's since been deleted.
  const activeWeekIndex = Math.max(
    0,
    Math.min(weekList.length - 1, search.week ?? 0),
  )

  const setActiveWeekIndex = (next: number | ((prev: number) => number)) => {
    const value = typeof next === 'function' ? next(activeWeekIndex) : next
    const clamped = Math.max(0, Math.min(weekList.length - 1, value))
    navigate({
      to: '.',
      search: (prev: any) => ({ ...prev, week: clamped }),
      // `replace` keeps tab-click churn out of the back-button stack —
      // the user's previous "real" page (e.g. post detail) stays one
      // step back regardless of how many weeks they cycle through.
      replace: true,
    })
  }

  const openGenerateDialog = (weekOffset: number) => {
    setPendingWeekOffset(weekOffset)
  }
  const closeGenerateDialog = () => {
    if (generateCalendar.isPending) return
    setPendingWeekOffset(null)
  }
  const submitGenerate = (userContext?: CalendarUserContextInput) => {
    if (pendingWeekOffset === null) return
    generateCalendar.mutate(
      { profileId, weekOffset: pendingWeekOffset, userContext },
      { onSettled: () => setPendingWeekOffset(null) },
    )
  }
  const dialogWeekLabel =
    pendingWeekOffset === null
      ? undefined
      : pendingWeekOffset === 0
        ? 'this week'
        : pendingWeekOffset === activeWeekIndex
          ? 'this calendar'
          : 'next week'

  const needsOnboarding =
    generateCalendar.isError &&
    (generateCalendar.error as any)?.message
      ?.toLowerCase()
      ?.includes('onboarding')

  const activeWeek = weekList[activeWeekIndex] ?? null
  const calendar = activeWeek?.calendar
  const posts: any[] = activeWeek?.posts ?? []

  const generatingWeek = useMemo(
    () => weekList.find((w: any) => w?.calendar?.status === 'generating'),
    [weekList],
  )
  const stages = useCalendarStream(generatingWeek?.calendar?._id, profileId)

  const scheduledCount = posts.filter(
    (p) =>
      p.status === 'approved' ||
      p.status === 'scheduled' ||
      p.status === 'published'
  ).length
  const readyCount = posts.filter((p) => p.status === 'ready').length

  const postsByDay = posts.reduce(
    (acc: Record<number, any[]>, post: any) => {
      const dayIdx = bucketDayIndex(post, calendar?.weekStartDate)
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
      <>
      <GenerateCalendarDialog
        open={pendingWeekOffset !== null}
        onOpenChange={(o) => (o ? null : closeGenerateDialog())}
        onGenerate={submitGenerate}
        isPending={generateCalendar.isPending}
        weekLabel={dialogWeekLabel}
      />
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
              <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
                Drop an idea below for a single post, or generate a full week
                of posts at once.
              </p>
            </div>
            <div className='w-full max-w-xl'>
              <ComposeBanner
                profileId={profileId}
                weekStartDate={currentMondayIso()}
              />
            </div>
            <Button
              variant='outline'
              onClick={() => openGenerateDialog(0)}
              disabled={generateCalendar.isPending}
            >
              {generateCalendar.isPending ? (
                <IconLoader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <IconCalendarPlus className='mr-2 size-4' />
              )}
              Or generate a full week
            </Button>
          </>
        )}
      </div>
      </>
    )
  }

  const sortedDayKeys = Object.keys(postsByDay)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className='mx-auto max-w-3xl'>
      <GenerateCalendarDialog
        open={pendingWeekOffset !== null}
        onOpenChange={(o) => (o ? null : closeGenerateDialog())}
        onGenerate={submitGenerate}
        isPending={generateCalendar.isPending}
        weekLabel={dialogWeekLabel}
      />
      {calendar && (
        <>
          <ComposeBanner
            profileId={profileId}
            calendarId={calendar._id}
            className='mb-4'
          />
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
                  onClick={() => openGenerateDialog(activeWeekIndex)}
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
                  onClick={() => openGenerateDialog(nextWeekOffset)}
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
                      stage={stages[post._id]}
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
            <div className='space-y-6'>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className='mb-3 h-4 w-28' />
                  <div className='rounded-lg border p-4'>
                    <div className='mb-3 flex items-start justify-between gap-3'>
                      <div className='flex-1 space-y-2'>
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-4/5' />
                      </div>
                      <Skeleton className='h-5 w-20 shrink-0 rounded-full' />
                    </div>
                    <div className='flex items-center gap-3'>
                      <Skeleton className='h-3 w-24' />
                      <Skeleton className='h-3 w-16' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
