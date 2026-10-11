import { Link } from '@tanstack/react-router'
import { IconBooks } from '@tabler/icons-react'
import { useLibraryNote } from '../query/library.query'

/** Post editor: the library notes this post was built on, each opening in the library. */
export function GroundedOn({ noteIds }: { noteIds: string[] }) {
  if (noteIds.length === 0) return null
  return (
    <div className='mt-4 space-y-1.5 rounded-lg border p-3'>
      <p className='flex items-center gap-1.5 text-xs font-semibold'>
        <IconBooks className='size-3.5' />
        Built on your library
      </p>
      {noteIds.map((id) => (
        <NoteLink key={id} id={id} />
      ))}
    </div>
  )
}

function NoteLink({ id }: { id: string }) {
  const { data: note, isError } = useLibraryNote(id)
  if (isError) return null
  return (
    <Link
      to='/library'
      search={{ note: id } as any}
      className='text-primary block truncate text-xs hover:underline'
    >
      {note?.title || 'A library note'}
    </Link>
  )
}
