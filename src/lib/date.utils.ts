import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export type Hour12 =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12'
export type MinuteQuarter = '00' | '15' | '30' | '45'
export type Period = 'AM' | 'PM'

/**
 * Converts 24-hour time to 12-hour format with period
 */
export const toPaddedHourAndPeriod = (
  hours24?: number
): { hour: string; period: Period } => {
  if (hours24 === undefined || hours24 === null || Number.isNaN(hours24)) {
    return { hour: '09', period: 'AM' }
  }
  const period: Period = hours24 >= 12 ? 'PM' : 'AM'
  let hour12 = hours24 % 12
  if (hour12 === 0) hour12 = 12
  return { hour: String(hour12).padStart(2, '0'), period }
}

/**
 * Converts minutes to the nearest quarter hour
 */
export const toQuarterMinute = (minutes?: number): MinuteQuarter => {
  if (minutes === undefined || minutes === null || Number.isNaN(minutes))
    return '00'
  const quarters = [0, 15, 30, 45]
  let closest = 0
  let minDiff = Infinity
  for (const q of quarters) {
    const diff = Math.abs(minutes - q)
    if (diff < minDiff) {
      minDiff = diff
      closest = q
    }
  }
  return String(closest).padStart(2, '0') as MinuteQuarter
}

/**
 * Converts wall-clock time in provided timezone to local time
 */
export const wallTimeInZoneToLocal = (
  zoneHours: number,
  zoneMinutes: number,
  timeZone?: string
): { hours24: number; minutes: number } => {
  const tz =
    timeZone && typeof timeZone === 'string' && timeZone.length
      ? timeZone
      : 'UTC'
  const todayInTz = dayjs().tz(tz)
  const hourStr = String(zoneHours ?? 0).padStart(2, '0')
  const minuteStr = String(zoneMinutes ?? 0).padStart(2, '0')
  const wallInTz = dayjs.tz(
    `${todayInTz.format('YYYY-MM-DD')} ${hourStr}:${minuteStr}:00`,
    tz
  )
  const local = wallInTz.local()
  return { hours24: local.hour(), minutes: local.minute() }
}

/**
 * Converts local time selection to UTC time
 */
export const toUTCFromLocalSelection = (
  hourStr: Hour12,
  minuteStr: MinuteQuarter,
  period: Period
): { hours: number; minutes: number } => {
  const hour12 = parseInt(hourStr, 10)
  let localHours24 = hour12 % 12
  if (period === 'PM') localHours24 += 12
  const tzLocal = dayjs.tz.guess()
  const todayLocal = dayjs().tz(tzLocal).format('YYYY-MM-DD')
  const localDateTime = dayjs.tz(
    `${todayLocal} ${String(localHours24).padStart(2, '0')}:${minuteStr}:00`,
    tzLocal
  )
  const utcDateTime = localDateTime.utc()
  return { hours: utcDateTime.hour(), minutes: utcDateTime.minute() }
}
