import { IconExternalLink, IconTrophy } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { EngagementSnapshot } from '../api/post-generator.api'
import { usePostEngagement } from '../query/post-generator.query'

type Metric = {
  label: string
  value: (s: EngagementSnapshot) => number | null
}

/**
 * X stores likes as reactions and replies as comments, and its reposts count
 * quotes too; the labels here are the ones the author sees on X.
 */
const X_METRICS: Metric[] = [
  { label: 'Views', value: (s) => s.views ?? s.impressions },
  { label: 'Likes', value: (s) => s.reactions },
  { label: 'Replies', value: (s) => s.comments },
  {
    label: 'Reposts',
    value: (s) =>
      s.reposts == null ? null : Math.max(0, s.reposts - (s.quotes ?? 0)),
  },
  { label: 'Quotes', value: (s) => s.quotes },
  { label: 'Bookmarks', value: (s) => s.bookmarks ?? s.saves },
]

const LINKEDIN_METRICS: Metric[] = [
  { label: 'Impressions', value: (s) => s.impressions },
  { label: 'Reactions', value: (s) => s.reactions },
  { label: 'Comments', value: (s) => s.comments },
  { label: 'Reposts', value: (s) => s.reposts },
]

function age(hours: number | null): string {
  if (hours == null) return '—'
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

const formatNumber = (n: number | null) =>
  n == null ? '—' : n.toLocaleString()

/**
 * How a published post is doing: the latest numbers, and one row per capture
 * (1h, 6h, a day, three days, a week on X) so the shape of the curve shows,
 * not just where it ended up.
 */
export function PostEngagementPanel({ postId }: { postId: string }) {
  const { data, isLoading } = usePostEngagement(postId)

  if (isLoading) {
    return <Skeleton className='mt-6 h-28 w-full rounded-lg' />
  }
  if (!data) return null

  const isX = data.platform === 'twitter'
  const metrics = isX ? X_METRICS : LINKEDIN_METRICS
  const snapshots = data.snapshots ?? []
  const latest = snapshots.at(-1)

  return (
    <section className='mt-6 rounded-lg border p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold'>Engagement</h3>
          {data.topPerformer && (
            <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300'>
              <IconTrophy className='size-3' />
              Top performer
            </span>
          )}
        </div>
        {data.publishedUrl && (
          <a
            href={data.publishedUrl}
            target='_blank'
            rel='noreferrer'
            className='text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline'
          >
            View on {isX ? 'X' : 'LinkedIn'}
            <IconExternalLink className='size-3' />
          </a>
        )}
      </div>

      {!latest ? (
        <p className='text-muted-foreground text-xs'>
          The first numbers arrive about an hour after it goes out
          {isX ? ', then at 6 hours, a day, three days and a week.' : '.'}
        </p>
      ) : (
        <>
          <div className='grid grid-cols-3 gap-3 sm:grid-cols-6'>
            {metrics.map((m) => (
              <div key={m.label}>
                <p className='text-muted-foreground text-[11px]'>{m.label}</p>
                <p className='text-base font-semibold tabular-nums'>
                  {formatNumber(m.value(latest))}
                </p>
              </div>
            ))}
          </div>

          {snapshots.length > 1 && (
            <table className='mt-4 w-full text-xs'>
              <thead>
                <tr className='text-muted-foreground text-left'>
                  <th className='py-1 pr-2 font-medium'>After</th>
                  {metrics.map((m) => (
                    <th key={m.label} className='py-1 pr-2 text-right font-medium'>
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.capturedAt} className='border-t'>
                    <td className='py-1 pr-2'>{age(s.hoursSincePublish)}</td>
                    {metrics.map((m) => (
                      <td key={m.label} className='py-1 pr-2 text-right tabular-nums'>
                        {formatNumber(m.value(s))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
