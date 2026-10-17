import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ILead, LeadIntent } from '../interface/lead.interface'

const INTENT_CONFIG: Record<LeadIntent, { label: string; className: string }> =
  {
    asking_for_tool: {
      label: 'Wants a tool',
      className:
        'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    asking_recommendation: {
      label: 'Seeking Rec',
      className:
        'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    tool_comparison: {
      label: 'Comparing',
      className:
        'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    pain_expression: {
      label: 'Pain Point',
      className:
        'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
    },
    general_discussion: {
      label: 'Discussion',
      className:
        'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
    no_signal: {
      label: 'No Signal',
      className:
        'border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400',
    },
  }

export function getSalesLeadColumns(): ColumnDef<ILead>[] {
  return [
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
      id: 'lead',
      header: 'Lead',
      cell: ({ row }) => {
        const { name, headline, profileUrl } = row.original
        return (
          <div className='max-w-[18rem] whitespace-normal'>
            {profileUrl ? (
              <a
                className='text-primary font-medium underline-offset-4 hover:underline'
                href={profileUrl}
                target='_blank'
                rel='noreferrer'
              >
                {name || 'Unknown'}
              </a>
            ) : (
              <span className='font-medium'>{name || 'Unknown'}</span>
            )}
            {headline && (
              <p className='text-muted-foreground line-clamp-2 text-xs'>
                {headline}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'intent',
      header: 'Intent',
      cell: ({ row }) => {
        const { intentSignal, intentReasoning } = row.original
        const config = intentSignal ? INTENT_CONFIG[intentSignal] : undefined
        if (!config) return <span className='text-muted-foreground'>--</span>
        const badge = (
          <Badge variant='outline' className={config.className}>
            {config.label}
          </Badge>
        )
        if (!intentReasoning) return badge
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent side='bottom' className='max-w-xs'>
                <p className='text-xs'>{intentReasoning}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      id: 'lastPost',
      header: 'Their post',
      cell: ({ row }) => {
        const { activityUrn, excerpt } = row.original.lastPost
        return (
          <a
            className='line-clamp-2 max-w-[24rem] break-words whitespace-normal'
            href={`https://www.linkedin.com/feed/update/${activityUrn}`}
            target='_blank'
            rel='noreferrer'
            title='Open on LinkedIn'
          >
            {excerpt}
          </a>
        )
      },
    },
    {
      id: 'lastEngagedAt',
      header: 'Last commented',
      cell: ({ row }) => {
        const { lastEngagedAt, interactions } = row.original
        return (
          <div className='whitespace-nowrap'>
            {lastEngagedAt ? format(new Date(lastEngagedAt), 'PP') : '--'}
            {interactions > 1 && (
              <p className='text-muted-foreground text-xs'>
                {interactions} comments
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'exportedAt',
      header: 'Exported',
      cell: ({ row }) => {
        const { exportedAt } = row.original
        return exportedAt ? (
          <span className='text-muted-foreground text-sm whitespace-nowrap'>
            {format(new Date(exportedAt), 'PP')}
          </span>
        ) : (
          <Badge variant='secondary'>New</Badge>
        )
      },
    },
  ]
}
