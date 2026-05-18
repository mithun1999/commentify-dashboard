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
import {
  useActiveCalendars,
  useGenerateCalendar,
  useScheduleAll,
} from '../query/post-generator.query'
import { PostCard } from './post-card'
import { PostEditorDialog } from './post-editor-dialog'

function formatWeekRange(dateStr: string) {
  const start = new Date(dateStr)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', yearOpts)}`
}

function formatWeekLabel(dateStr: string) {
  const start = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return start.toLocaleDateString('en-US', opts)
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
  const { data: weeks, isLoading } = useActiveCalendars(profileId)
  const generateCalendar = useGenerateCalendar()
  const scheduleAll = useScheduleAll()
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

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

  const selectedPost = selectedPostId
    ? posts.find((p: any) => p._id === selectedPostId)
    : null

  const nextWeekOffset = weekList.length
  const canGenerateNext = weekList.length < 4

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <IconLoader2 className='text-muted-foreground size-6 animate-spin' />
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
      {weekList.length > 0 && (
        <div className='mb-4 flex items-center gap-2'>
          {weekList.map((w: any, idx: number) => (
            <Button
              key={w.calendar._id}
              variant={idx === activeWeekIndex ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveWeekIndex(idx)}
            >
              Week {idx + 1}: {formatWeekLabel(w.calendar.weekStartDate)}
            </Button>
          ))}
          {canGenerateNext && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                generateCalendar.mutate({
                  profileId,
                  weekOffset: nextWeekOffset,
                })
              }
              disabled={generateCalendar.isPending}
            >
              {generateCalendar.isPending ? (
                <IconLoader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <IconPlus className='mr-2 size-4' />
              )}
              Next Week
            </Button>
          )}
        </div>
      )}

      {calendar && (
        <>
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  disabled={activeWeekIndex === 0}
                  onClick={() =>
                    setActiveWeekIndex((i) => Math.max(0, i - 1))
                  }
                >
                  <IconChevronLeft className='size-4' />
                </Button>
                <h2 className='text-lg font-semibold'>
                  {formatWeekRange(calendar.weekStartDate)}
                </h2>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  disabled={activeWeekIndex >= weekList.length - 1}
                  onClick={() =>
                    setActiveWeekIndex((i) =>
                      Math.min(weekList.length - 1, i + 1)
                    )
                  }
                >
                  <IconChevronRight className='size-4' />
                </Button>
              </div>
              <Badge variant={statusBadgeVariant(calendar.status)}>
                {calendar.status}
              </Badge>
              <span className='text-muted-foreground text-sm'>
                {scheduledCount}/{posts.length} scheduled
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => scheduleAll.mutate(calendar._id)}
                disabled={scheduleAll.isPending || readyCount === 0}
              >
                {scheduleAll.isPending ? (
                  <IconLoader2 className='mr-2 size-4 animate-spin' />
                ) : null}
                Approve & Schedule All
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  generateCalendar.mutate({
                    profileId,
                    weekOffset: activeWeekIndex,
                  })
                }
                disabled={generateCalendar.isPending}
              >
                {generateCalendar.isPending ? (
                  <IconLoader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <IconCalendarPlus className='mr-2 size-4' />
                )}
                Regenerate
              </Button>
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
                      onClick={() => setSelectedPostId(post._id)}
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

          <PostEditorDialog
            post={selectedPost}
            calendarId={calendar._id}
            profileId={profileId}
            open={!!selectedPost}
            onOpenChange={(open) => {
              if (!open) setSelectedPostId(null)
            }}
          />
        </>
      )}
    </div>
  )
}
