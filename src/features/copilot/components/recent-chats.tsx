import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { useConversationsQuery } from '../query/copilot.query'

export function RecentChats({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useConversationsQuery()
  const recent = (data ?? []).slice(0, limit)

  // Nothing yet is the normal first-run state, and an empty "Recent" heading
  // reads as something failing to load.
  if (isLoading || !recent.length) return null

  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground px-3 pb-1 text-xs font-medium'>
        Recent
      </p>
      {recent.map((conversation) => (
        <Link
          key={conversation._id}
          to='/copilot/$conversationId'
          params={{ conversationId: conversation._id }}
          className='hover:bg-muted group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors'
        >
          <MessageSquare className='text-muted-foreground size-4 shrink-0' />
          <span className='flex-1 truncate text-sm'>
            {conversation.title || 'Untitled chat'}
          </span>
          <span className='text-muted-foreground shrink-0 text-xs'>
            {formatDistanceToNow(new Date(conversation.lastMessageAt), {
              addSuffix: true,
            })}
          </span>
        </Link>
      ))}
    </div>
  )
}
