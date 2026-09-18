import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Posts are placed in the zone they were scheduled in, not the browser's. A
 * 5:00 AM Asia/Kolkata post is 23:30 UTC the day before, so bucketing locally
 * would draw it on the wrong square for anyone in a different zone.
 *
 * An unknown zone falls back to UTC rather than throwing, matching the
 * backend's own `safeZone`.
 */
function safeZone(tz?: string | null): string {
  if (!tz) return 'UTC'
  try {
    dayjs().tz(tz)
    return tz
  } catch {
    return 'UTC'
  }
}

export const dayKeyInZone = (value: string | Date, tz?: string | null) =>
  dayjs(value).tz(safeZone(tz)).format('YYYY-MM-DD')

export const timeInZone = (value: string | Date, tz?: string | null) =>
  dayjs(value).tz(safeZone(tz)).format('h:mm A')

/** `YYYY-MM` for the month the user is currently in. */
export const currentMonthKey = (tz?: string | null) =>
  dayjs().tz(safeZone(tz)).format('YYYY-MM')

export const shiftMonthKey = (monthKey: string, months: number) =>
  normalizeMonthKey(monthKey).add(months, 'month').format('YYYY-MM')

/** Guards against a hand-edited `?month=` in the URL. */
function normalizeMonthKey(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey ?? '')) return dayjs().startOf('month')
  const parsed = dayjs(`${monthKey}-01`)
  return parsed.isValid() ? parsed : dayjs().startOf('month')
}

interface MonthGrid {
  monthKey: string
  /** e.g. "September 2026" */
  label: string
  /** Inclusive ISO bounds spanning every rendered cell, for the API window. */
  from: string
  to: string
  /** Day keys in render order. Always whole Monday-first weeks. */
  days: string[]
  /** Day keys that fall outside `monthKey`, dimmed in the grid. */
  outsideDays: Set<string>
}

/**
 * The visible cells for a month, padded out to whole weeks. Weeks start
 * Monday to match the backend's `weekStartFor`, so a rendered row lines up
 * with the ContentCalendar week a post belongs to.
 */
export function buildMonthGrid(
  monthKey: string,
  tz?: string | null
): MonthGrid {
  const zone = safeZone(tz)
  const monthStart = dayjs.tz(
    `${normalizeMonthKey(monthKey).format('YYYY-MM')}-01`,
    zone
  )
  const monthEnd = monthStart.endOf('month')

  const startDow = monthStart.day()
  const gridStart = monthStart.add(startDow === 0 ? -6 : 1 - startDow, 'day')

  const endDow = monthEnd.day()
  const gridEnd = monthEnd.add(endDow === 0 ? 0 : 7 - endDow, 'day')

  const days: string[] = []
  const outsideDays = new Set<string>()
  const month = monthStart.format('YYYY-MM')

  for (
    let cursor = gridStart;
    !cursor.isAfter(gridEnd, 'day');
    cursor = cursor.add(1, 'day')
  ) {
    const key = cursor.format('YYYY-MM-DD')
    days.push(key)
    if (cursor.format('YYYY-MM') !== month) outsideDays.add(key)
  }

  return {
    monthKey: month,
    label: monthStart.format('MMMM YYYY'),
    from: gridStart.startOf('day').toISOString(),
    to: gridEnd.endOf('day').toISOString(),
    days,
    outsideDays,
  }
}

export const dayNumber = (dayKey: string) => Number(dayKey.slice(-2))

export const isToday = (dayKey: string, tz?: string | null) =>
  dayKey === dayjs().tz(safeZone(tz)).format('YYYY-MM-DD')

export const weekdayLabels = (): string[] => [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]
