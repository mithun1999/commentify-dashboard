import {
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { IconBooks, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { LibraryNote } from '../api/library.api'
import { useLibraryNotes } from '../query/library.query'

export interface TaggedNote {
  _id: string
  title: string
}

/** Most notes one message can tag (the server allows the same). */
export const MAX_TAGGED_NOTES = 5

const titleOf = (n: LibraryNote) =>
  n.title || n.source.fileName || n.source.url || 'Untitled note'

/** The change typed one "@" at the start of a word (not in an email). */
export function typedAtTrigger(next: string, previous: string): boolean {
  return (
    next.length === previous.length + 1 &&
    next.endsWith('@') &&
    next.startsWith(previous) &&
    (next.length === 1 || /\s/.test(next[next.length - 2]))
  )
}

/**
 * Tagged notes for one text box. Pass `onTextChange` the box's next and
 * previous value: an "@" typed at the start of a word opens the picker.
 */
export function useNoteTagging() {
  const [tagged, setTagged] = useState<TaggedNote[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** The picker was opened by an "@" that is still at the end of the text. */
  const [fromAt, setFromAt] = useState(false)

  const onTextChange = (next: string, previous: string): string => {
    if (typedAtTrigger(next, previous) && tagged.length < MAX_TAGGED_NOTES) {
      setFromAt(true)
      setQuery('')
      setOpen(true)
    }
    return next
  }

  return {
    tagged,
    ids: tagged.map((n) => n._id),
    open,
    setOpen,
    query,
    setQuery,
    fromAt,
    setFromAt,
    onTextChange,
    add: (note: TaggedNote) =>
      setTagged((prev) =>
        prev.some((n) => n._id === note._id) || prev.length >= MAX_TAGGED_NOTES
          ? prev
          : [...prev, note]
      ),
    remove: (id: string) =>
      setTagged((prev) => prev.filter((n) => n._id !== id)),
    clear: () => setTagged([]),
  }
}

export type NoteTagging = ReturnType<typeof useNoteTagging>

/**
 * The library button and its searchable list of ready notes. Picking one
 * tags it and drops the "@" that opened the list. Closing without a pick
 * keeps what was typed, so "@" still works for a handle.
 */
export function NotePicker({
  tagging,
  setText,
  profileId,
  returnFocusTo,
}: {
  tagging: NoteTagging
  setText: Dispatch<SetStateAction<string>>
  /** Only notes this profile may use. */
  profileId?: string
  returnFocusTo?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>
}) {
  const { tagged, open, query, fromAt } = tagging
  const q = query.trim()
  const scope = profileId ? { profileId } : {}
  // The latest notes, matched here as you type; past 100 notes the server's
  // word search fills in the rest.
  const recent = useLibraryNotes(
    { status: 'ready', limit: 100, ...scope },
    open
  )
  const searched = useLibraryNotes(
    { status: 'ready', limit: 20, q, ...scope },
    open && q.length >= 3 && (recent.data?.total ?? 0) > 100
  )

  const items = useMemo(() => {
    const needle = q.toLowerCase()
    const local = (recent.data?.items ?? []).filter(
      (n) =>
        !needle ||
        titleOf(n).toLowerCase().includes(needle) ||
        n.gist.toLowerCase().includes(needle) ||
        n.topics.some((t) => t.includes(needle))
    )
    const extra = (searched.data?.items ?? []).filter(
      (n) => !local.some((l) => l._id === n._id)
    )
    return [...local, ...extra]
      .filter((n) => !tagged.some((t) => t._id === n._id))
      .slice(0, 30)
  }, [q, recent.data, searched.data, tagged])

  const close = (picked: TaggedNote | null) => {
    if (fromAt) {
      setText((t) =>
        !t.endsWith('@') ? t : picked ? t.slice(0, -1) : t + query
      )
    }
    if (picked) tagging.add(picked)
    tagging.setFromAt(false)
    tagging.setQuery('')
    tagging.setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => (o ? tagging.setOpen(true) : close(null))}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='text-muted-foreground h-7 gap-1 px-2 text-xs'
          title='Tag a note from your library, or type @'
          disabled={tagged.length >= MAX_TAGGED_NOTES}
        >
          <IconBooks className='size-3.5' />
          Library
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0'
        align='start'
        onCloseAutoFocus={(e) => {
          if (!returnFocusTo?.current) return
          e.preventDefault()
          returnFocusTo.current.focus()
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={tagging.setQuery}
            placeholder='Search your library'
          />
          <CommandList>
            <CommandEmpty>
              {recent.isLoading
                ? 'Loading…'
                : recent.data?.total === 0
                  ? 'Your library is empty. Add notes on the Library page.'
                  : 'Nothing matches.'}
            </CommandEmpty>
            {items.length > 0 && (
              <CommandGroup>
                {items.map((note) => (
                  <CommandItem
                    key={note._id}
                    value={note._id}
                    onSelect={() =>
                      close({ _id: note._id, title: titleOf(note) })
                    }
                    className='flex flex-col items-start gap-0.5'
                  >
                    <span className='w-full truncate text-sm'>
                      {titleOf(note)}
                    </span>
                    {note.gist && (
                      <span className='text-muted-foreground line-clamp-1 w-full text-xs'>
                        {note.gist}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** The tagged notes, each removable. */
export function NoteChips({
  tagged,
  onRemove,
}: {
  tagged: TaggedNote[]
  onRemove: (id: string) => void
}) {
  if (tagged.length === 0) return null
  return (
    <div className='flex flex-wrap gap-1.5'>
      {tagged.map((note) => (
        <span
          key={note._id}
          className='bg-primary/10 text-primary inline-flex max-w-[240px] items-center gap-1 rounded-md px-2 py-0.5 text-xs'
        >
          <IconBooks className='size-3 shrink-0' />
          <span className='truncate'>{note.title}</span>
          <button
            type='button'
            onClick={() => onRemove(note._id)}
            aria-label={`Remove ${note.title}`}
            className='hover:text-foreground shrink-0'
          >
            <IconX className='size-3' />
          </button>
        </span>
      ))}
    </div>
  )
}
