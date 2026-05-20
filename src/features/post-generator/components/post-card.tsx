import {
  IconCheck,
  IconX,
  IconSend,
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useApprovePost, useRejectPost, usePublishPost } from '../query/post-generator.query'

interface PostCardProps {
  post: any
  calendarId: string
  onClick: () => void
}

function postStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
    case 'published':
    case 'scheduled':
      return 'default'
    case 'ready':
      return 'outline'
    case 'rejected':
    case 'failed':
    case 'needs_attention':
      return 'destructive'
    case 'generating':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getHookPreview(content: string | undefined) {
  if (!content) return 'No content yet...'
  const firstLine = content.split('\n')[0]
  return firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine
}

export function PostCard({ post, calendarId, onClick }: PostCardProps) {
  const approvePost = useApprovePost(calendarId)
  const rejectPost = useRejectPost(calendarId)
  const publishPost = usePublishPost(calendarId)

  const isGenerating = post.status === 'generating'
  const charCount = post.content?.length ?? 0

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-lg border p-4 transition-colors',
        'hover:border-primary/40 hover:bg-muted/50',
        isGenerating && 'opacity-60'
      )}
      onClick={onClick}
    >
      <div className='mb-2 flex items-start justify-between gap-3'>
        {isGenerating ? (
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
          </div>
        ) : (
          <p className='text-sm leading-relaxed'>{getHookPreview(post.content)}</p>
        )}
        <Badge variant={postStatusVariant(post.status)} className='shrink-0'>
          {post.status}
        </Badge>
      </div>

      <div className='flex items-center justify-between'>
        <div className='text-muted-foreground flex items-center gap-3 text-xs'>
          {post.topic && <span>{post.topic}</span>}
          {post.pillar && (
            <>
              <span className='text-muted-foreground/40'>|</span>
              <span>{post.pillar}</span>
            </>
          )}
          {charCount > 0 && (
            <>
              <span className='text-muted-foreground/40'>|</span>
              <span
                className={cn(
                  charCount >= 1000 && charCount <= 1200
                    ? 'text-green-600'
                    : charCount >= 800 && charCount <= 1300
                      ? 'text-yellow-600'
                      : 'text-red-500'
                )}
              >
                {charCount} chars
              </span>
            </>
          )}
          {post.overallScore != null && (
            <>
              <span className='text-muted-foreground/40'>|</span>
              <span>Score: {post.overallScore.toFixed(1)}</span>
            </>
          )}
        </div>

        {(post.status === 'ready' || post.status === 'needs_attention') && (
          <div
            className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              onClick={() => approvePost.mutate(post._id)}
              disabled={approvePost.isPending}
              title='Approve & Schedule'
            >
              <IconCheck className='size-3.5 text-green-600' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              onClick={() =>
                rejectPost.mutate({
                  postId: post._id,
                  reason: 'Not aligned with goals',
                  profileId: post.profileId,
                })
              }
              disabled={rejectPost.isPending}
              title='Reject & Regenerate'
            >
              <IconX className='size-3.5 text-red-500' />
            </Button>
          </div>
        )}

        {post.status === 'failed' && (
          <div
            className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={() => publishPost.mutate(post._id)}
              disabled={publishPost.isPending}
            >
              {publishPost.isPending ? (
                <IconLoader2 className='mr-1 size-3 animate-spin' />
              ) : (
                <IconSend className='mr-1 size-3' />
              )}
              Retry Publish
            </Button>
          </div>
        )}

        {(post.status === 'approved' || post.status === 'scheduled') && (
          <div
            className='opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={() => publishPost.mutate(post._id)}
              disabled={publishPost.isPending}
            >
              {publishPost.isPending ? (
                <IconLoader2 className='mr-1 size-3 animate-spin' />
              ) : (
                <IconSend className='mr-1 size-3' />
              )}
              Publish Now
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
