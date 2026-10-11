import { useState } from 'react'
import { IconArrowsLeftRight, IconSettings } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProfileLinkSuggestion } from '../api/profile-links.api'
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
 * Agent Hub: a "same person?" card while a LinkedIn and an X profile are
 * unlinked, and one line per link with its settings. Renders nothing for
 * an account with a single platform.
 */
export function ProfileLinksCard({ className }: { className?: string }) {
  const { data } = useProfileLinks()
  const dismiss = useDismissProfileLink()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)

  if (!data) return null
  const suggestion = data.suggestions[0]
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
              linkedin: data.unlinked.linkedin,
              x: data.unlinked.x,
              preselect: {
                linkedinId: suggestion.linkedin._id,
                xId: suggestion.x._id,
              },
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

      {data.links.map((link) => (
        <div
          key={link._id}
          className='bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2'
        >
          <div className='flex min-w-0 flex-wrap items-center gap-2 text-sm'>
            <PlatformIcon platform='linkedin' />
            <span className='font-medium'>{link.linkedin.name}</span>
            <IconArrowsLeftRight className='text-muted-foreground size-3.5' />
            <PlatformIcon platform='twitter' />
            <span className='font-medium'>{link.x.handle}</span>
            <span className='text-muted-foreground text-xs'>
              {link.mirror.linkedinToX === 'auto-draft'
                ? `· Every LinkedIn post gets an X version, ${link.mirror.offsetHours}h later`
                : '· X versions only when you ask'}
            </span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='h-7'
            onClick={() => setTarget({ kind: 'edit', link })}
          >
            <IconSettings className='mr-1 size-3.5' />
            Edit
          </Button>
        </div>
      ))}

      <LinkProfilesDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
      />
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
        {compact ? (
          <p className='text-sm font-medium'>
            Post your LinkedIn posts here too?
          </p>
        ) : (
          <p className='flex flex-wrap items-center gap-1.5 text-sm font-medium'>
            Same person?
            <PlatformIcon platform='linkedin' />
            {suggestion.linkedin.name}
            <span className='text-muted-foreground font-normal'>and</span>
            <PlatformIcon platform='twitter' />
            {suggestion.x.handle}
            {suggestion.namesMatch && (
              <span className='text-muted-foreground text-xs font-normal'>
                (names match)
              </span>
            )}
          </p>
        )}
        <p className='text-muted-foreground text-xs'>
          {compact
            ? `Link ${suggestion.linkedin.name} on LinkedIn and every LinkedIn post can get an X version for you to approve.`
            : 'Link them and every LinkedIn post can get an X version, written for X, for you to approve.'}
        </p>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button
          variant='ghost'
          size='sm'
          disabled={dismissing}
          onClick={onDismiss}
        >
          {compact ? 'Not now' : 'Not the same'}
        </Button>
        <Button size='sm' onClick={onLink}>
          Link profiles
        </Button>
      </div>
    </div>
  )
}

/**
 * X calendar: the same suggestion, worded for the page it sits on, shown
 * only while this X profile has an unlinked LinkedIn match.
 */
export function MirrorPrompt({
  xProfileId,
  className,
}: {
  xProfileId: string
  className?: string
}) {
  const { data } = useProfileLinks()
  const dismiss = useDismissProfileLink()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)

  const suggestion = data?.suggestions.find((s) => s.x._id === xProfileId)
  if (!data || !suggestion) return null

  return (
    <div className={className}>
      <SuggestionBanner
        compact
        suggestion={suggestion}
        dismissing={dismiss.isPending}
        onLink={() =>
          setTarget({
            kind: 'new',
            linkedin: data.unlinked.linkedin,
            x: data.unlinked.x,
            preselect: {
              linkedinId: suggestion.linkedin._id,
              xId: suggestion.x._id,
            },
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
