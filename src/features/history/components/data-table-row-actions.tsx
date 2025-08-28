import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Row } from '@tanstack/react-table'
import { IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApprovePosts } from '../query/post.query'
import { useHistoryStore } from '../store/history.store'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const setOpen = useHistoryStore((s) => s.setOpen)
  const setCurrentRow = useHistoryStore((s) => s.setCurrentRow)
  const status = useHistoryStore((s) => s.status)
  const { approvePosts, isApprovingPosts } = useApprovePosts(() =>
    setOpen(null)
  )

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='data-[state=open]:bg-muted flex h-8 w-8 p-0'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        {status === 'pending' && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row.original as unknown)
                setOpen('update')
              }}
            >
              Edit comment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row.original as unknown)
                const { activityUrn, profileId } = row.original as unknown as {
                  activityUrn: string
                  profileId: string
                }
                approvePosts({ posts: [{ activityUrn, profileId }] })
              }}
              disabled={isApprovingPosts}
            >
              {isApprovingPosts ? 'Approving…' : 'Approve'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row.original as unknown)
                setOpen('delete')
              }}
            >
              Delete
              <DropdownMenuShortcut>
                <IconTrash size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
