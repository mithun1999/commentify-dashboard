import {
  IconExternalLink,
  IconFileText,
  IconPhoto,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TimelinePost } from '../api/post-generator.api'
import { linkedinPostUrl } from '../utils/linkedin-url.util'
import { timeInZone } from '../utils/timeline-date.util'

const STATUS_DOT: Record<string, string> = {
  published: 'bg-green-500',
  scheduled: 'bg-primary',
  approved: 'bg-primary',
  ready: 'bg-amber-500',
  generating: 'bg-muted-foreground animate-pulse',
  needs_attention: 'bg-red-500',
  failed: 'bg-red-500',
  rejected: 'bg-muted-foreground/50',
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'published':
    case 'scheduled':
    case 'approved':
      return 'default'
    case 'failed':
    case 'needs_attention':
      return 'destructive'
    case 'generating':
      return 'secondary'
    default:
      return 'outline'
  }
}

function MediaIcon({ kind }: { kind: TimelinePost['mediaKind'] }) {
  if (kind === 'pdf') return <IconFileText className='size-3 shrink-0' />
  if (kind === 'image') return <IconPhoto className='size-3 shrink-0' />
  return null
}

interface ChipProps {
  post: TimelinePost
  timezone: string
  onSelect: () => void
}

/** Day-cell density: one line, no actions. */
export function PostChip({ post, timezone, onSelect }: ChipProps) {
  return (
    <button
      type='button'
      onClick={onSelect}
      title={post.hook || 'Untitled post'}
      className='hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none'
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          STATUS_DOT[post.status] ?? 'bg-muted-foreground'
        )}
      />
      {post.scheduledAt && (
        <span className='text-muted-foreground shrink-0 text-[10px] tabular-nums'>
          {timeInZone(post.scheduledAt, timezone)}
        </span>
      )}
      <span className='truncate text-[11px]'>
        {post.hook || 'Untitled post'}
      </span>
    </button>
  )
}

/** Popover density: enough to decide whether to open the editor. */
export function PostListRow({ post, timezone, onSelect }: ChipProps) {
  const liveUrl = linkedinPostUrl(post.publishedActivityUrn)

  return (
    <div className='hover:bg-muted/50 rounded-md border p-2.5 transition-colors'>
      <div className='mb-1.5 flex items-center gap-2'>
        <Badge
          variant={statusVariant(post.status)}
          className='text-[10px] capitalize'
        >
          {post.status.replace('_', ' ')}
        </Badge>
        {post.scheduledAt && (
          <span className='text-muted-foreground text-[11px] tabular-nums'>
            {timeInZone(post.scheduledAt, timezone)}
          </span>
        )}
        <MediaIcon kind={post.mediaKind} />
        {liveUrl && (
          <a
            href={liveUrl}
            target='_blank'
            rel='noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-[11px]'
          >
            View on LinkedIn
            <IconExternalLink className='size-3' />
          </a>
        )}
      </div>

      <button
        type='button'
        onClick={onSelect}
        className='w-full text-left text-xs leading-relaxed'
      >
        <span className='line-clamp-3'>{post.hook || 'No content yet...'}</span>
        <span className='text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-[11px]'>
          {post.topic && <span>{post.topic}</span>}
          {post.charCount > 0 && <span>{post.charCount} chars</span>}
          {/* The slot date drives placement, so say so when the post actually
              went out on a different day. */}
          {post.publishedAt &&
            post.scheduledAt &&
            timeInZone(post.publishedAt, timezone) !==
              timeInZone(post.scheduledAt, timezone) && (
              <span>
                Published {timeInZone(post.publishedAt, timezone)}
              </span>
            )}
        </span>
      </button>
    </div>
  )
}
