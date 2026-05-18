import { useParams, Link } from '@tanstack/react-router'
import { IconCalendar, IconLoader2 } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { useCalendarHistory } from '../query/post-generator.query'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CalendarHistory() {
  const { profileId } = useParams({ strict: false }) as { profileId: string }
  const { data: calendars, isLoading } = useCalendarHistory(profileId)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <IconLoader2 className='text-muted-foreground size-6 animate-spin' />
      </div>
    )
  }

  if (!calendars || calendars.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-20'>
        <IconCalendar className='text-muted-foreground/40 size-10' />
        <p className='text-muted-foreground text-sm'>No calendar history yet.</p>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-2xl space-y-3'>
      <h2 className='mb-4 text-lg font-semibold'>Past Calendars</h2>
      {calendars.map((cal: any) => (
        <div
          key={cal._id}
          className='flex items-center justify-between rounded-lg border p-4'
        >
          <div className='flex items-center gap-3'>
            <IconCalendar className='text-muted-foreground size-5' />
            <div>
              <p className='text-sm font-medium'>
                Week of {formatDate(cal.weekStartDate)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {cal.cadence} posts · Created{' '}
                {formatDate(cal.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant={cal.status === 'completed' ? 'default' : 'secondary'}>
            {cal.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}
