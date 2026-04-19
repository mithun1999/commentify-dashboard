import type { Platform } from '../types/agent.types'
import type { ISetting } from '@/features/settings/interface/setting.interface'

export function getNextRunTime(jobTiming: {
  hours: number
  minutes: number
}): Date {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(jobTiming.hours, jobTiming.minutes, 0, 0)
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next
}

export function formatNextRunRelative(date: Date): string {
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 'soon'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 0) return `in ${hours}h ${minutes}m`
  return `in ${minutes}m`
}

export function getJobTiming(
  setting: ISetting | undefined,
  platform: Platform
): { hours: number; minutes: number } | null {
  if (!setting) return null
  const timing =
    platform === 'twitter'
      ? setting.twitterScrapeSetting?.jobTiming
      : setting.scrapeSetting?.jobTiming
  if (!timing || timing.hours == null || timing.minutes == null) return null
  return timing
}
