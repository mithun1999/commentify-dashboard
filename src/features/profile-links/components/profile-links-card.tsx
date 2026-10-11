import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowsLeftRight, IconSettings } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  ProfileLink,
  ProfileLinkSuggestion,
  ProfileLinks,
} from '../api/profile-links.api'

/**
 * Suggestions whose profiles are both still free: the dashboard keeps
 * links one to one, though the backend would suggest more.
 */
function freeSuggestions(data: ProfileLinks): ProfileLinkSuggestion[] {
  const linked = new Set(data.links.flatMap((l) => [l.linkedin._id, l.x._id]))
  return data.suggestions.filter(
    (s) => !linked.has(s.linkedin._id) && !linked.has(s.x._id)
  )
}
import {
  useDismissProfileLink,
  useProfileLinks,
} from '../query/profile-links.query'
import {
  LinkProfilesDialog,
  PlatformIcon,
  type LinkDialogTarget,
} from './link-profiles-dialog'

/**
 * Agent Hub: a "same person?" card while there is a pair worth suggesting,
 * one at a time, and a one-line summary of what is linked, pointing to the
 * Linked profiles page. Renders nothing for an account on one platform.
 * Dismissing a suggestion is for good; the page still links the pair.
 */
export function ProfileLinksCard({ className }: { className?: string }) {
  const { data } = useProfileLinks()
  const dismiss = useDismissProfileLink()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)

  if (!data) return null
  // Linking shares posts, so an account with no posting agent isn't asked.
  const posting = [...data.profiles.linkedin, ...data.profiles.x].some(
    (p) => p.postingActive
  )
  const suggestion = posting ? freeSuggestions(data)[0] : undefined
  if (!suggestion && data.links.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {suggestion && (
        <SuggestionBanner
          suggestion={suggestion}
          dismissing={dismiss.isPending}
          onLink={() =>
            setTarget({
              kind: 'new',
              linkedinId: suggestion.linkedin._id,
              xId: suggestion.x._id,
            })
          }
          onDismiss={() =>
            dismiss.mutate({
              linkedinProfileId: suggestion.linkedin._id,
              xProfileId: suggestion.x._id,
            })
          }
        />
      )}

      {data.links.length > 0 && <LinkSummary links={data.links} />}

      <LinkProfilesDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </div>
  )
}

function LinkSummary({ links }: { links: ProfileLink[] }) {
  const only = links.length === 1 ? links[0] : null
  const people = new Set(links.map((l) => l.linkedin._id)).size
  const accounts = new Set(links.map((l) => l.x._id)).size
  return (
    <div className='bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2'>
      <div className='flex min-w-0 flex-wrap items-center gap-2 text-sm'>
        {only ? (
          <>
            <PlatformIcon platform='linkedin' />
            <span className='font-medium'>{only.linkedin.name}</span>
            <IconArrowsLeftRight className='text-muted-foreground size-3.5' />
            <PlatformIcon platform='twitter' />
            <span className='font-medium'>{only.x.handle}</span>
            <span className='text-muted-foreground text-xs'>
              · posts shared{' '}
              {only.mirror.linkedinToX === 'auto-draft' &&
              only.mirror.xToLinkedin === 'auto-draft'
                ? 'both ways'
                : only.mirror.linkedinToX === 'auto-draft'
                  ? 'LinkedIn → X'
                  : only.mirror.xToLinkedin === 'auto-draft'
                    ? 'X → LinkedIn'
                    : 'when you ask'}
            </span>
          </>
        ) : (
          <span>
            <span className='font-medium'>
              {links.length} links
            </span>{' '}
            between {people} LinkedIn profile{people === 1 ? '' : 's'} and{' '}
            {accounts} X account{accounts === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <Button variant='ghost' size='sm' className='h-7' asChild>
        <Link to='/linked-profiles'>
          <IconSettings className='mr-1 size-3.5' />
          Manage
        </Link>
      </Button>
    </div>
  )
}

function SuggestionBanner({
  suggestion,
  onLink,
  onDismiss,
  dismissing,
  compact,
}: {
  suggestion: ProfileLinkSuggestion
  onLink: () => void
  onDismiss: () => void
  dismissing: boolean
  compact?: boolean
}) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3'>
      <div className='min-w-0 space-y-0.5'>
        <p className='flex flex-wrap items-center gap-1.5 text-sm font-medium'>
          {compact ? 'Share posts with' : 'Same person?'}
          <PlatformIcon platform='linkedin' />
          {suggestion.linkedin.name}
          <span className='text-muted-foreground font-normal'>and</span>
          <PlatformIcon platform='twitter' />
          {suggestion.x.handle}
          {!compact && suggestion.namesMatch && (
            <span className='text-muted-foreground text-xs font-normal'>
              (names match)
            </span>
          )}
          {compact && '?'}
        </p>
        <p className='text-muted-foreground text-xs'>
          Link them and a post on either side gets a version on the other,
          written for that network, for you to approve.
        </p>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button variant='ghost' size='sm' disabled={dismissing} onClick={onDismiss}>
          {compact ? "Don't show again" : 'Not the same'}
        </Button>
        <Button size='sm' onClick={onLink}>
          Link profiles
        </Button>
      </div>
    </div>
  )
}

/**
 * A posting calendar, on either network: the suggestion for this profile,
 * worded for the page it sits on.
 */
export function MirrorPrompt({
  profileId,
  className,
}: {
  profileId: string
  className?: string
}) {
  const { data } = useProfileLinks()
  const dismiss = useDismissProfileLink()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)

  const suggestion = data
    ? freeSuggestions(data).find(
        (s) => s.x._id === profileId || s.linkedin._id === profileId
      )
    : undefined
  if (!data || !suggestion) return null
  const fromX = suggestion.x._id === profileId

  return (
    <div className={className}>
      <SuggestionBanner
        compact
        suggestion={suggestion}
        dismissing={dismiss.isPending}
        onLink={() =>
          setTarget({
            kind: 'new',
            linkedinId: suggestion.linkedin._id,
            xId: suggestion.x._id,
            lock: fromX ? 'twitter' : 'linkedin',
          })
        }
        onDismiss={() =>
          dismiss.mutate({
            linkedinProfileId: suggestion.linkedin._id,
            xProfileId: suggestion.x._id,
          })
        }
      />
      <LinkProfilesDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </div>
  )
}
