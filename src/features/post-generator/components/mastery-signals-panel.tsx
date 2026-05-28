import { useState } from 'react'
import {
  IconAward,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconRefresh,
  IconBulb,
  IconTrendingUp,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useMasterySignals,
  useRecomputeMasterySignals,
} from '../query/post-generator.query'
import type {
  AuthorityArtifact,
  AuthorityArtifactKind,
} from '../api/post-generator.api'

interface MasterySignalsPanelProps {
  profileId: string
}

const ARTIFACT_KIND_META: Record<
  AuthorityArtifactKind,
  { label: string; icon: typeof IconBulb }
> = {
  metric: { label: 'Metric', icon: IconTrendingUp },
  named_project: { label: 'Project', icon: IconAward },
  before_after: { label: 'Before / After', icon: IconRefresh },
  lesson_from_failure: { label: 'Lesson', icon: IconAlertTriangle },
  citation: { label: 'Citation', icon: IconBulb },
}

const ARTIFACT_FALLBACK_META = { label: 'Receipt', icon: IconBulb }

function formatComputedAt(iso: string | null): string {
  if (!iso) return 'never computed'
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return 'never computed'
  const diffMs = Date.now() - ts
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function MasterySignalsSkeleton() {
  return (
    <div className='space-y-5'>
      <div className='space-y-2'>
        <Skeleton className='h-3 w-32' />
        <ul className='space-y-2'>
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className='border-muted/40 flex items-center justify-between gap-3 rounded-lg border p-2.5'
            >
              <div className='min-w-0 flex-1 space-y-1.5'>
                <Skeleton className='h-3.5 w-2/3' />
                <Skeleton className='h-2.5 w-4/5' />
              </div>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-1.5 w-16 rounded-full' />
                <Skeleton className='h-2.5 w-9' />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className='space-y-2'>
        <Skeleton className='h-3 w-40' />
        <ul className='space-y-2'>
          {[0, 1].map((i) => (
            <li
              key={i}
              className='border-muted/40 space-y-2 rounded-lg border p-2.5'
            >
              <Skeleton className='h-3.5 w-11/12' />
              <Skeleton className='h-3.5 w-3/4' />
              <div className='flex gap-1'>
                <Skeleton className='h-4 w-14 rounded-full' />
                <Skeleton className='h-4 w-20 rounded-full' />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className='space-y-2'>
        <Skeleton className='h-3 w-36' />
        <ul className='space-y-2'>
          {[0, 1].map((i) => (
            <li
              key={i}
              className='border-muted/40 rounded-lg border p-2.5'
            >
              <div className='flex items-start gap-2'>
                <Skeleton className='mt-0.5 size-3.5 shrink-0 rounded' />
                <div className='min-w-0 flex-1 space-y-1.5'>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-4 w-14 rounded-full' />
                    <Skeleton className='h-3 w-1/3' />
                  </div>
                  <Skeleton className='h-3 w-full' />
                  <Skeleton className='h-3 w-5/6' />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MasteryScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)))
  return (
    <div className='bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full'>
      <div
        className='bg-primary h-full rounded-full transition-all'
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ArtifactPayloadSummary({ artifact }: { artifact: AuthorityArtifact }) {
  const raw = artifact.payload
  // Backend persists payload as a single rephrasable sentence (string). The
  // defensive branches below cover legacy rows that may have an object or
  // missing payload — render those without iterating character-by-character.
  let text = ''
  if (typeof raw === 'string') {
    text = raw
  } else if (raw && typeof raw === 'object') {
    text = JSON.stringify(raw)
  }
  text = text.trim()
  if (!text) return null
  return (
    <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
      {text}
    </p>
  )
}

export function MasterySignalsPanel({ profileId }: MasterySignalsPanelProps) {
  const { data, isLoading, isError } = useMasterySignals(profileId)
  const recompute = useRecomputeMasterySignals(profileId)
  const [expanded, setExpanded] = useState(false)

  const topics = data?.expertiseTopics ?? []
  const perspectives = data?.signaturePerspectives ?? []
  const artifacts = data?.authorityArtifacts ?? []
  // The job runs in a Bull queue (~20-60s). Treat it as a loading state
  // even if the cached data is non-empty — otherwise the user sees a stale
  // result with no indication that a fresh run is in progress.
  const isComputing = data?.status === 'computing' || recompute.isPending
  const failedMessage = data?.status === 'failed' ? data.error : null
  const empty =
    !isLoading &&
    !isError &&
    !isComputing &&
    topics.length === 0 &&
    perspectives.length === 0 &&
    artifacts.length === 0

  const sortedTopics = [...topics].sort(
    (a, b) => b.masteryScore - a.masteryScore,
  )

  return (
    <div className='rounded-xl border p-6'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div className='flex items-start gap-2'>
          <IconAward className='text-primary mt-0.5 size-5 shrink-0' />
          <div>
            <h2 className='text-lg font-semibold'>What we know about you</h2>
            <p className='text-muted-foreground text-xs'>
              Topics you've mastered, beliefs you carry, and concrete
              receipts your posts can lean on.{' '}
              <span className='whitespace-nowrap'>
                {isComputing
                  ? 'Re-analyzing now — usually 20-30s…'
                  : `Last updated ${formatComputedAt(data?.computedAt ?? null)}.`}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending || isLoading || isComputing}
        >
          {isComputing ? (
            <IconLoader2 className='mr-2 size-4 animate-spin' />
          ) : (
            <IconRefresh className='mr-2 size-4' />
          )}
          {isComputing ? 'Re-analyzing…' : 'Re-analyze'}
        </Button>
      </div>

      {(isLoading || isComputing) && <MasterySignalsSkeleton />}

      {isError && (
        <p className='text-destructive text-sm'>
          Couldn't load expertise. Try Re-analyze.
        </p>
      )}

      {!isComputing && failedMessage && (
        <div className='border-destructive/30 bg-destructive/5 mb-3 rounded-lg border p-3'>
          <div className='flex items-start gap-2'>
            <IconAlertTriangle className='text-destructive mt-0.5 size-4 shrink-0' />
            <div className='min-w-0 flex-1 text-xs'>
              <p className='text-destructive font-medium'>
                Last re-analysis failed
              </p>
              <p
                className='text-muted-foreground mt-0.5 break-words'
                title={failedMessage}
              >
                {failedMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {empty && (
        <p className='text-muted-foreground text-sm'>
          No expertise extracted yet. Click <strong>Re-analyze</strong> to mine
          your top posts for signals of mastery — usually takes 20-30 seconds.
        </p>
      )}

      {!isLoading && !isError && !isComputing && !empty && (
        <div className='space-y-5'>
          {sortedTopics.length > 0 && (
            <div>
              <p className='text-muted-foreground mb-2 text-xs font-medium'>
                Expertise topics ({sortedTopics.length})
              </p>
              <ul className='space-y-2'>
                {sortedTopics.map((t) => (
                  <li
                    key={t.topic}
                    className='border-muted/40 flex items-center justify-between gap-3 rounded-lg border p-2.5'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium'>{t.topic}</p>
                      {t.evidence?.length > 0 && (
                        <p
                          className='text-muted-foreground line-clamp-1 text-[11px]'
                          title={t.evidence.join(' • ')}
                        >
                          Evidence: {t.evidence.join(' • ')}
                        </p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <MasteryScoreBar score={t.masteryScore} />
                      <span className='text-muted-foreground w-9 text-right text-[11px] tabular-nums'>
                        {Math.round(t.masteryScore * 100)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {perspectives.length > 0 && (
            <div>
              <p className='text-muted-foreground mb-2 text-xs font-medium'>
                Signature perspectives ({perspectives.length})
              </p>
              <ul className='space-y-2'>
                {perspectives.slice(0, expanded ? perspectives.length : 3).map(
                  (p, idx) => (
                    <li
                      key={`${p.belief.slice(0, 30)}-${idx}`}
                      className='border-muted/40 rounded-lg border p-2.5'
                    >
                      <p className='text-sm leading-snug'>"{p.belief}"</p>
                      {p.topics?.length > 0 && (
                        <div className='mt-1.5 flex flex-wrap gap-1'>
                          {p.topics.map((tag) => (
                            <Badge
                              key={tag}
                              variant='secondary'
                              className='text-[10px]'
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {artifacts.length > 0 && (
            <div>
              <p className='text-muted-foreground mb-2 text-xs font-medium'>
                Authority artifacts ({artifacts.length})
              </p>
              <ul className='space-y-2'>
                {artifacts
                  .slice(0, expanded ? artifacts.length : 3)
                  .map((a, idx) => {
                    const meta =
                      ARTIFACT_KIND_META[a.kind] ?? ARTIFACT_FALLBACK_META
                    const Icon = meta.icon
                    return (
                      <li
                        key={`${a.kind}-${idx}`}
                        className='border-muted/40 rounded-lg border p-2.5'
                      >
                        <div className='flex items-start gap-2'>
                          <Icon className='text-muted-foreground mt-0.5 size-3.5 shrink-0' />
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant='outline'
                                className='text-[10px] capitalize'
                              >
                                {meta.label}
                              </Badge>
                              <span className='text-muted-foreground truncate text-xs'>
                                {a.topic}
                              </span>
                            </div>
                            <ArtifactPayloadSummary artifact={a} />
                          </div>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}

          {(perspectives.length > 3 || artifacts.length > 3) && (
            <button
              type='button'
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                'hover:text-primary text-muted-foreground flex items-center gap-1 text-xs font-medium transition-colors',
              )}
            >
              {expanded ? (
                <>
                  <IconChevronUp className='size-3.5' /> Show less
                </>
              ) : (
                <>
                  <IconChevronDown className='size-3.5' /> Show all (
                  {perspectives.length + artifacts.length} items)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
