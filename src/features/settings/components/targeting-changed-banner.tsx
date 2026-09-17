import { formatDistanceToNow } from 'date-fns'
import { Undo2, Wand2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  useRevertTargetingChangeQuery,
  useTargetingChangesQuery,
} from '@/features/settings/query/setting.query'
import type { ITargetingChange } from '../interface/setting.interface'

/**
 * The fields the admin targeting endpoint is allowed to touch, in the words
 * the customer sees on this page rather than the schema's.
 */
const FIELD_LABELS: Record<string, string> = {
  keywordsToTarget: 'Keywords',
  numberOfPostsToScrapePerDay: 'Comments per day',
  languageToTarget: 'Language',
  engagementThreshold: 'Engagement threshold',
  skipHiringPosts: 'Skip hiring posts',
  skipArticlePosts: 'Skip article posts',
  skipJobUpdatePosts: 'Skip job update posts',
  skipCompanyPosts: 'Skip company posts',
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'not set'
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'none'
  }
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  return String(value)
}

/**
 * Only the fields that actually moved, described as a before and after.
 *
 * Showing the whole change record would include fields whose value was already
 * what the change asked for, which reads as us having altered something we did
 * not.
 */
function describeChange(change: ITargetingChange) {
  return Object.entries(change.changed ?? {}).map(([field, move]) => ({
    field,
    label: FIELD_LABELS[field] ?? field,
    from: formatValue(move?.from),
    to: formatValue(move?.to),
  }))
}

export function TargetingChangedBanner({ profileId }: { profileId?: string }) {
  const { targetingChanges } = useTargetingChangesQuery(profileId)
  const { revertTargetingChange, isRevertingTargetingChange } =
    useRevertTargetingChangeQuery()

  // A reverted change is history, not news. The customer has already seen it
  // and acted on it, so leaving it on the page would make the banner
  // permanent.
  const pending = targetingChanges.filter((change) => !change.revertedAt)
  if (!profileId || pending.length === 0) return null

  return (
    <Alert className='mb-6 border-sky-500/50 bg-sky-50 dark:bg-sky-950/20'>
      <Wand2 className='text-sky-600' />
      <AlertTitle className='text-sky-800 dark:text-sky-300'>
        {pending.length === 1
          ? 'We adjusted your targeting'
          : `We made ${pending.length} adjustments to your targeting`}
      </AlertTitle>
      <AlertDescription>
        <p>
          Your agent was not delivering the number of comments you are paying
          for, so we changed the settings below to fix it. Everything here is
          yours to keep or undo.
        </p>

        <div className='mt-3 space-y-3'>
          {pending.map((change) => {
            const moves = describeChange(change)
            return (
              <div
                key={change.id}
                className='rounded-lg border border-sky-200 bg-white/60 p-3 dark:border-sky-500/30 dark:bg-sky-950/30'
              >
                <p className='text-foreground text-sm'>{change.reason}</p>

                <ul className='mt-2 space-y-1 text-sm'>
                  {moves.map((move) => (
                    <li key={move.field} className='text-muted-foreground'>
                      <span className='text-foreground font-medium'>
                        {move.label}
                      </span>
                      : {move.from} &rarr; {move.to}
                    </li>
                  ))}
                </ul>

                <div className='mt-3 flex items-center gap-3'>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={isRevertingTargetingChange}
                    onClick={() =>
                      revertTargetingChange({ profileId, changeId: change.id })
                    }
                  >
                    <Undo2 className='mr-1.5 size-3.5' />
                    Undo this change
                  </Button>
                  <span className='text-muted-foreground text-xs'>
                    {change.at
                      ? formatDistanceToNow(new Date(change.at), {
                          addSuffix: true,
                        })
                      : null}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </AlertDescription>
    </Alert>
  )
}
