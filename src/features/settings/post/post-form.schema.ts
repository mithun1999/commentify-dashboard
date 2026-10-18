import { z } from 'zod'
import { Hour12, MinuteQuarter, Period } from '@/lib/date.utils'

// Matches MAX_AUTHOR_TITLES in linkedin-scraper-be. With more titles in the
// filter LinkedIn returns no posts at all.
export const MAX_AUTHOR_TITLES = 6
export const MAX_AUTHOR_TITLES_MESSAGE =
  'Pick up to 6 titles. LinkedIn returns no posts when the title filter has more.'

export const notificationsFormSchema = z.object({
  keywords: z.array(z.string()).max(6),
  authorTitles: z
    .array(z.string())
    .max(MAX_AUTHOR_TITLES, { message: MAX_AUTHOR_TITLES_MESSAGE }),
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
