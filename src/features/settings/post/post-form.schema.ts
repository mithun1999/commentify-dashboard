import { z } from 'zod'
import { Hour12, MinuteQuarter, Period } from '@/lib/date.utils'

// Every title is ORed into one LinkedIn search filter, and past six LinkedIn
// returns no posts at all (a profile saved with ten got nothing for any
// keyword). The backend refuses more than this too.
export const MAX_AUTHOR_TITLES = 6

export const notificationsFormSchema = z.object({
  keywords: z.array(z.string()).max(6),
  authorTitles: z.array(z.string()).max(MAX_AUTHOR_TITLES, {
    message: `Pick at most ${MAX_AUTHOR_TITLES} titles. With more, LinkedIn finds no posts.`,
  }),
  geography: z.array(z.string()),
  numberOfPostsToScrapePerDay: z.number().min(1).max(100),
  engagementThreshold: z.enum(['strict', 'moderate', 'disabled']),
  skipHiringPosts: z.boolean(),
  skipJobUpdatePosts: z.boolean(),
  skipArticlePosts: z.boolean(),
  autoSchedule: z.boolean(),
  rules: z
    .string()
    .max(100, {
      message: 'Rules must be at most 100 characters.',
    })
    .optional(),
  startHour: z.enum([
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
  ]) as z.ZodType<Hour12>,
  startMinute: z.enum(['00', '15', '30', '45']) as z.ZodType<MinuteQuarter>,
  startPeriod: z.enum(['AM', 'PM']) as z.ZodType<Period>,
})
