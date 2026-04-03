import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/features/history/components/data-table-column-header'
import { DataTableRowActions } from '@/features/history/components/data-table-row-actions'
import type { IPost, IntentSignal, PitchFit } from '@/features/history/interface/post.interface'

const INTENT_CONFIG: Record<
  IntentSignal,
  { label: string; className: string }
> = {
  pain_expression: {
    label: 'Pain Point',
    className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  },
  tool_comparison: {
    label: 'Comparing',
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  asking_recommendation: {
    label: 'Seeking Rec',
    className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
  },
  general_discussion: {
    label: 'Discussion',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  no_signal: {
    label: 'No Signal',
    className: 'border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400',
  },
}

const PITCH_FIT_CONFIG: Record<PitchFit, { label: string; className: string }> = {
  natural: {
    label: 'Natural',
    className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
  },
  tangential: {
    label: 'Tangential',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  forced: {
    label: 'Forced',
    className: 'border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400',
  },
}

export function getSalesPostColumns(_status: 'pending' | 'completed') {
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
            className='line-clamp-2 max-w-[28rem] break-words'
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
      id: 'intent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Intent' />
      ),
      accessorFn: (row) => row.salesContext?.intentSignal ?? '',
      cell: ({ row }) => {
        const ctx = row.original.salesContext
        if (!ctx) return <span className='text-muted-foreground'>--</span>

        const config = INTENT_CONFIG[ctx.intentSignal]
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant='outline' className={config.className}>
                  {config.label}
                </Badge>
              </TooltipTrigger>
              {ctx.intentReasoning && (
                <TooltipContent side='bottom' className='max-w-xs'>
                  <p className='text-xs'>{ctx.intentReasoning}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      id: 'pitchFit',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Pitch Fit' />
      ),
      accessorFn: (row) => row.salesContext?.pitchFit ?? '',
      cell: ({ row }) => {
        const ctx = row.original.salesContext
        if (!ctx) return <span className='text-muted-foreground'>--</span>

        const config = PITCH_FIT_CONFIG[ctx.pitchFit]
        return (
          <Badge variant='outline' className={config.className}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      id: 'commentContent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Comment' />
      ),
      accessorFn: (row) => row.comment?.content ?? '',
      cell: ({ row }) => (
        <span className='line-clamp-2 max-w-[24rem] break-words'>
          {row.original.comment?.content ?? '--'}
        </span>
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
