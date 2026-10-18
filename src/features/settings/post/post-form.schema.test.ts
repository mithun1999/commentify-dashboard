import { describe, expect, it } from 'vitest'
import {
  MAX_AUTHOR_TITLES_MESSAGE,
  notificationsFormSchema,
} from './post-form.schema'

const base = {
  keywords: ['AI'],
  authorTitles: [] as string[],
  geography: [],
  numberOfPostsToScrapePerDay: 10,
  engagementThreshold: 'moderate',
  skipHiringPosts: false,
  skipJobUpdatePosts: false,
  skipArticlePosts: false,
  autoSchedule: true,
  rules: '',
  startHour: '09',
  startMinute: '00',
  startPeriod: 'AM',
}

describe('notificationsFormSchema', () => {
  it('accepts 6 author titles', () => {
    const authorTitles = [
      'CFO',
      'Head of Finance',
      'HR',
      'Founder',
      'CEO',
      'Recruitment Director',
    ]
    const result = notificationsFormSchema.safeParse({ ...base, authorTitles })
    expect(result.success).toBe(true)
  })

  it('rejects 7 author titles with the cap message', () => {
    const authorTitles = [
      'CFO',
      'HR',
      'Founder',
      'CEO',
      'CTO',
      'VP',
      'Director',
    ]
    const result = notificationsFormSchema.safeParse({ ...base, authorTitles })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['authorTitles'])
    expect(result.error?.issues[0].message).toBe(MAX_AUTHOR_TITLES_MESSAGE)
  })
})
