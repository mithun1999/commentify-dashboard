import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ApprovalReasonEnum } from '@/features/agent-system/enum/agent-run.enum'
import { IPost } from '../interface/post.interface'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'

export function getPostColumns(_status: 'pending' | 'completed') {
  const columns: ColumnDef<IPost>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'content',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Post' />
      ),
      cell: ({ row }) => {
        const activityUrn = row.original.activityUrn
        const url = `https://linkedin.com/feed/update/${activityUrn}`
        return (
          <a
            className='line-clamp-2 max-w-[40rem] break-words'
            href={url}
            target='_blank'
            rel='noreferrer'
            title='Open on LinkedIn'
          >
            {row.original.content}
          </a>
        )
      },
    },
    {
      accessorKey: 'authorName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Author' />
      ),
      cell: ({ row }) => (
        <a
          className='text-primary underline underline-offset-4'
          href={row.original.authorProfileUrl}
          target='_blank'
          rel='noreferrer'
        >
          {row.original.authorName}
        </a>
      ),
    },
    {
      id: 'commentContent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Comment' />
      ),
      accessorFn: (row) => row.comment?.content ?? '',
      cell: ({ row }) => (
        <div className='max-w-[32rem]'>
          {row.original.comment?.approvalReason ===
            ApprovalReasonEnum.ONBOARDING_PREVIEW && (
            // These were written during signup and held, so they are older
            // than the rest of the queue and need saying so - the post may
            // have moved on since.
            <Badge variant='secondary' className='mb-1'>
              From your setup
            </Badge>
          )}
          <span className='line-clamp-2 break-words'>
            {row.original.comment?.content ?? '--'}
          </span>
        </div>
      ),
    },
    {
      id: 'commentPostedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Commented At' />
      ),
      accessorFn: (row) => row.comment?.postedAt ?? null,
      cell: ({ row }) => {
        const postedAt = row.original.comment?.postedAt
        return postedAt ? (
          <span>{format(new Date(postedAt), 'PP pp')}</span>
        ) : (
          <span>--</span>
        )
      },
      enableHiding: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
      enableHiding: false,
    },
  ]

  return columns
}
