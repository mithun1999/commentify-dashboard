import { describe, expect, it } from 'vitest'
import { notificationsFormSchema } from './post-form.schema'

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
  it('rejects a seventh author title', () => {
    const authorTitles = ['CEO', 'CTO', 'CFO', 'COO', 'CMO', 'Founder', 'VP']
    const result = notificationsFormSchema.safeParse({ ...base, authorTitles })
    expect(result.success).toBe(false)
  })

  it('accepts more than three author titles', () => {
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
})
