import { useState } from 'react'
import { IconBooks, IconPlus, IconSearch } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { NoteSourceType } from '../api/library.api'
import { useLibraryNotes } from '../query/library.query'
import { AddNoteDialog } from './add-note-dialog'
import { NoteDrawer } from './note-drawer'
import { NoteList } from './note-list'

/**
 * Search, filter, add and open notes. The Library page shows everything;
 * a profile's tab passes `profileId` for what that profile may use, with
 * pin and exclude.
 */
export function LibraryBrowser({
  profileId,
  initialNoteId,
}: {
  profileId?: string
  initialNoteId?: string
}) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<NoteSourceType | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(initialNoteId ?? null)
  const { data, isLoading } = useLibraryNotes({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(type !== 'all' ? { type } : {}),
    ...(profileId ? { profileId } : {}),
    limit: 100,
  })

  const empty = !isLoading && data && data.total === 0 && !q && type === 'all'

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative min-w-[200px] flex-1'>
          <IconSearch className='text-muted-foreground absolute top-2.5 left-3 size-4' />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search titles, points and topics'
            className='pl-9'
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className='w-[150px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Everything</SelectItem>
            <SelectItem value='url'>Links</SelectItem>
            <SelectItem value='file'>Files</SelectItem>
            <SelectItem value='paste'>Pasted</SelectItem>
            <SelectItem value='research'>From research</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}>
          <IconPlus className='mr-1 size-4' />
          Add
        </Button>
      </div>

      {data && (
        <p className='text-muted-foreground text-xs'>
          {data.count} of {data.noteLimit} notes on your plan
          {profileId
            ? '. Pin a note to have the planner use it this week; hide one to keep it off this profile.'
            : '. Notes found while researching posts are added for you and don\'t count.'}
        </p>
      )}

      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      ) : empty ? (
        <div className='flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center'>
          <IconBooks className='text-muted-foreground size-8' />
          <div className='space-y-1'>
            <p className='font-medium'>Your Knowledge Hub is empty</p>
            <p className='text-muted-foreground max-w-sm text-sm'>
              Add articles, case studies, decks or notes. Every number, quote
              and point is kept, and your posts can be built on them.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <IconPlus className='mr-1 size-4' />
            Add your first note
          </Button>
        </div>
      ) : data && data.items.length > 0 ? (
        <NoteList
          notes={data.items}
          profileId={profileId}
          onOpen={(note) => setOpenId(note._id)}
        />
      ) : (
        <p className='text-muted-foreground text-sm'>Nothing matches.</p>
      )}

      <AddNoteDialog open={adding} onOpenChange={setAdding} profileId={profileId} />
      <NoteDrawer
        noteId={openId}
        onOpenChange={(open) => !open && setOpenId(null)}
        defaultProfileId={profileId}
      />
    </div>
  )
}
