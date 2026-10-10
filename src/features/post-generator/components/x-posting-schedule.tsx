import { useEffect, useMemo, useState } from 'react'
import { IconCalendarEvent, IconLoader2 } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { resolvePostPlanSetting } from '@/config/plan-setting.config'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import {
  usePostingPreferences,
  useUpdatePostingPreferences,
} from '../query/post-generator.query'

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
const DEFAULT_DAYS = ALL_DAYS.slice(0, 5)
/** Same defaults the backend fills in: morning, early afternoon, late afternoon. */
const DEFAULT_TIMES = ['09:00', '13:00', '17:00']
/** Original posts closer than this read as automation on X (backend X_MIN_GAP_MINUTES). */
const MIN_GAP_MINUTES = 20

/** Every half hour from 05:00 to 23:30, as "HH:mm". */
const TIME_OPTIONS = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

/**
 * Times for `count` daily posts, keeping the ones already chosen. With nothing
 * chosen it is the backend's defaults; an added slot goes to the daytime half
 * hour furthest from the existing ones, so a third post never lands 30 minutes
 * after the first.
 */
function defaultTimes(count: number, existing: string[] = []): string[] {
  if (!existing.length) return DEFAULT_TIMES.slice(0, count)
  const out = [...existing].slice(0, count)
  const daytime = TIME_OPTIONS.filter((t) => {
    const m = toMinutes(t)
    return m >= 8 * 60 && m <= 20 * 60
  })
  while (out.length < count) {
    let best = daytime[0]
    let bestGap = -1
    for (const t of daytime) {
      if (out.includes(t)) continue
      const gap = Math.min(...out.map((o) => Math.abs(toMinutes(o) - toMinutes(t))))
      if (gap > bestGap) {
        best = t
        bestGap = gap
      }
    }
    out.push(best)
  }
  return out.sort((a, b) => toMinutes(a) - toMinutes(b))
}

/**
 * Posting schedule for an X profile. X is planned per day (plan §4.2), so this
 * replaces LinkedIn's posts-per-week with posts per day and one time per daily
 * post. Only settings the agent acts on today are shown; reply-to-replies,
 * the first-reply link and newsjack slots arrive with their backend.
 */
export function XPostingSchedule({ profileId }: { profileId: string }) {
  const { data: user } = useGetUserQuery()
  const { data: prefs, isLoading } = usePostingPreferences(profileId)
  const updatePrefs = useUpdatePostingPreferences()

  const cap = Number(resolvePostPlanSetting('xPostsPerDay', user) ?? 1)
  const threadsOnPlan = resolvePostPlanSetting('xThreads', user) === true
  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const [postsPerDay, setPostsPerDay] = useState(1)
  const [preferredDays, setPreferredDays] = useState<string[]>(DEFAULT_DAYS)
  const [preferredTimes, setPreferredTimes] = useState<string[]>(['09:00'])
  const [allowThreads, setAllowThreads] = useState(true)
  const [timezone, setTimezone] = useState(browserTimezone)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!prefs) return
    const perDay = Math.min(
      Math.max(prefs.postsPerDay ?? (cap > 1 ? 2 : 1), 1),
      cap
    )
    setPostsPerDay(perDay)
    setPreferredDays(prefs.preferredDays?.length ? prefs.preferredDays : DEFAULT_DAYS)
    setPreferredTimes(defaultTimes(perDay, prefs.preferredTimes ?? []))
    setAllowThreads(prefs.allowThreads ?? true)
    // Same rule as the LinkedIn schedule: a never-set zone is stored as UTC,
    // so prefer the browser's and mark the form dirty to get it saved.
    const stored = prefs.timezone
    const resolved = !stored || stored === 'UTC' ? browserTimezone : stored
    setTimezone(resolved)
    setDirty(resolved !== stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, cap])

  const changePostsPerDay = (n: number) => {
    setPostsPerDay(n)
    setPreferredTimes((prev) => defaultTimes(n, prev))
    setDirty(true)
  }

  const changeTime = (index: number, value: string) => {
    setPreferredTimes((prev) => prev.map((t, i) => (i === index ? value : t)))
    setDirty(true)
  }

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
    setDirty(true)
  }

  const tooClose = useMemo(() => {
    const sorted = [...preferredTimes].map(toMinutes).sort((a, b) => a - b)
    return sorted.some((m, i) => i > 0 && m - sorted[i - 1] < MIN_GAP_MINUTES)
  }, [preferredTimes])

  const canSave = dirty && !tooClose && preferredDays.length > 0

  const save = () => {
    updatePrefs.mutate(
      {
        profileId,
        prefs: {
          postsPerDay,
          preferredDays,
          preferredTimes: [...preferredTimes].sort(
            (a, b) => toMinutes(a) - toMinutes(b)
          ),
          allowThreads: threadsOnPlan ? allowThreads : false,
          timezone,
        },
      },
      { onSuccess: () => setDirty(false) }
    )
  }

  return (
    <div className='rounded-xl border p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <IconCalendarEvent className='text-primary size-5' />
          <h2 className='text-lg font-semibold'>Posting Schedule</h2>
        </div>
        <Button
          size='sm'
          onClick={save}
          disabled={!canSave || updatePrefs.isPending}
        >
          {updatePrefs.isPending ? (
            <IconLoader2 className='mr-2 size-4 animate-spin' />
          ) : null}
          Save Changes
        </Button>
      </div>

      {isLoading ? (
        <div className='space-y-5'>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className='mb-2 h-3 w-24' />
              <Skeleton className='h-9 w-56 rounded-md' />
            </div>
          ))}
        </div>
      ) : (
        <div className='space-y-5'>
          <div>
            <p className='text-muted-foreground mb-2 text-xs font-medium'>
              Posts Per Day
            </p>
            <div className='flex items-center gap-2'>
              {[1, 2, 3].map((n) => {
                const locked = n > cap
                return (
                  <button
                    key={n}
                    type='button'
                    disabled={locked}
                    onClick={() => changePostsPerDay(n)}
                    title={locked ? 'Available on the Pro plan' : undefined}
                    className={cn(
                      'flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                      postsPerDay === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted',
                      locked && 'cursor-not-allowed opacity-40 hover:bg-transparent'
                    )}
                  >
                    {n}
                  </button>
                )
              })}
              {cap < 3 && (
                <Badge variant='outline' className='text-xs'>
                  Up to 3 a day on Pro
                </Badge>
              )}
            </div>
            <p className='text-muted-foreground mt-1.5 text-xs'>
              {postsPerDay * preferredDays.length} posts a week. Short, regular
              posts do better on X than a few long ones.
            </p>
          </div>

          <div>
            <p className='text-muted-foreground mb-2 text-xs font-medium'>
              Preferred Days
            </p>
            <div className='flex flex-wrap gap-2'>
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type='button'
                  onClick={() => toggleDay(day)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    preferredDays.includes(day)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            {preferredDays.length === 0 && (
              <p className='mt-1.5 text-xs text-red-500'>Pick at least one day.</p>
            )}
          </div>

          <div>
            <p className='text-muted-foreground mb-2 text-xs font-medium'>
              Posting Times
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              {preferredTimes.map((time, i) => (
                <div key={i} className='flex items-center gap-1.5'>
                  {postsPerDay > 1 && (
                    <span className='text-muted-foreground text-xs'>
                      Post {i + 1}
                    </span>
                  )}
                  <select
                    value={time}
                    onChange={(e) => changeTime(i, e.target.value)}
                    className='border-input bg-background ring-offset-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2'
                  >
                    {(TIME_OPTIONS.includes(time)
                      ? TIME_OPTIONS
                      : [time, ...TIME_OPTIONS]
                    ).map((t) => (
                      <option key={t} value={t}>
                        {timeLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {tooClose ? (
              <p className='mt-2 text-xs text-red-500'>
                Keep posts at least {MIN_GAP_MINUTES} minutes apart; back-to-back
                posts look automated to X.
              </p>
            ) : (
              <p className='text-muted-foreground mt-2 text-xs'>
                Times are in your timezone ({timezone.replace(/_/g, ' ')}).
                Posts publish at these local times.
              </p>
            )}
          </div>

          <div className='flex items-start justify-between gap-4 border-t pt-5'>
            <div className='space-y-0.5'>
              <div className='flex items-center gap-2'>
                <p className='text-sm font-medium'>Threads</p>
                {!threadsOnPlan && (
                  <Badge variant='outline' className='text-xs'>
                    Pro
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground text-xs'>
                Let the agent turn step-by-step ideas, frameworks and stories
                into a 3-6 post thread. Off means every slot is a single post.
              </p>
            </div>
            <Switch
              checked={threadsOnPlan && allowThreads}
              disabled={!threadsOnPlan}
              onCheckedChange={(checked) => {
                setAllowThreads(checked)
                setDirty(true)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
