import { formatDistanceToNow } from 'date-fns'
import {
  IconAlertTriangle,
  IconClipboardText,
  IconFileText,
  IconLink,
  IconLoader2,
  IconPin,
  IconPinFilled,
  IconSearch,
  IconEyeOff,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LibraryNote, NoteSourceType } from '../api/library.api'
import { useRetryNote, useSetNoteForProfile } from '../query/library.query'

const SOURCE_ICON: Record<NoteSourceType, React.ElementType> = {
  url: IconLink,
  file: IconFileText,
  paste: IconClipboardText,
  research: IconSearch,
}

const SOURCE_LABEL: Record<NoteSourceType, string> = {
  url: 'Link',
  file: 'File',
  paste: 'Pasted',
  research: 'From research',
}

/**
 * The library as a list. On a profile's tab each note also has pin
 * ("always offer to this profile") and exclude ("never"), and shows when the
 * profile used it lately.
 */
export function NoteList({
  notes,
  onOpen,
  profileId,
}: {
  notes: LibraryNote[]
  onOpen: (note: LibraryNote) => void
  profileId?: string
}) {
  const retry = useRetryNote()
  const setForProfile = useSetNoteForProfile()

  return (
    <div className='bg-card divide-y rounded-lg border'>
      {notes.map((note) => {
        const Icon = SOURCE_ICON[note.source.type] ?? IconFileText
        const pinned = !!profileId && note.pinnedProfileIds.includes(profileId)
        const excluded = !!profileId && note.excludedProfileIds.includes(profileId)
        return (
          <div
            key={note._id}
            className={cn(
              'flex items-start gap-3 px-4 py-3',
              excluded && 'opacity-60'
            )}
          >
            <Icon className='text-muted-foreground mt-0.5 size-4 shrink-0' />
            <button
              type='button'
              className='min-w-0 flex-1 space-y-1 text-left'
              onClick={() => onOpen(note)}
              disabled={note.status === 'processing'}
            >
              <p className='truncate text-sm font-medium'>
                {note.title ||
                  note.source.fileName ||
                  note.source.url ||
                  'Untitled note'}
              </p>
              {note.status === 'processing' ? (
                <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <IconLoader2 className='size-3 animate-spin' />
                  Reading it…
                </p>
              ) : note.status === 'failed' ? (
                <p className='flex items-center gap-1.5 text-xs text-red-600'>
                  <IconAlertTriangle className='size-3' />
                  {note.error || "Couldn't read this."}
                </p>
              ) : (
                <>
                  {note.gist && (
                    <p className='text-muted-foreground line-clamp-2 text-xs'>
                      {note.gist}
                    </p>
                  )}
                  <div className='flex flex-wrap items-center gap-1.5'>
                    {note.topics.slice(0, 5).map((t) => (
                      <Badge key={t} variant='secondary' className='text-[10px]'>
                        {t}
                      </Badge>
                    ))}
                    <span className='text-muted-foreground text-[11px]'>
                      {SOURCE_LABEL[note.source.type]} · {note.claimCount} point
                      {note.claimCount === 1 ? '' : 's'} ·{' '}
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      {note.usedByProfile ? ' · used lately' : ''}
                    </span>
                  </div>
                </>
              )}
            </button>

            <div className='flex shrink-0 items-center gap-1'>
              {note.status === 'failed' && (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7'
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(note._id)}
                >
                  Retry
                </Button>
              )}
              {profileId && note.status === 'ready' && (
                <>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='size-7'
                    title={pinned ? 'Unpin' : 'Pin: the planner uses it this week'}
                    onClick={() =>
                      setForProfile.mutate({
                        id: note._id,
                        profileId,
                        state: pinned ? 'default' : 'pinned',
                      })
                    }
                  >
                    {pinned ? (
                      <IconPinFilled className='size-4' />
                    ) : (
                      <IconPin className='size-4' />
                    )}
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    className={cn('size-7', excluded && 'text-red-600')}
                    title={excluded ? 'Allow for this profile' : 'Never use for this profile'}
                    onClick={() =>
                      setForProfile.mutate({
                        id: note._id,
                        profileId,
                        state: excluded ? 'default' : 'excluded',
                      })
                    }
                  >
                    <IconEyeOff className='size-4' />
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
