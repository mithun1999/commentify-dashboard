import { useState } from 'react'
import {
  IconCheck,
  IconX,
  IconSend,
  IconLoader2,
  IconArrowBackUp,
  IconAlertTriangle,
  IconTrash,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  useApprovePost,
  useUnapprovePost,
  useRejectPost,
  useDeletePost,
  usePublishPost,
  type PostStage,
} from '../query/post-generator.query'
import { RejectPostDialog } from './reject-post-dialog'
import { DeletePostDialog } from './delete-post-dialog'

interface PostCardProps {
  post: any
  calendarId: string
  onClick: () => void
  stage?: PostStage
}

const STAGE_LABEL: Record<PostStage, string> = {
  researching: 'Researching sources',
  planning: 'Planning the angle',
  writing: 'Writing the draft',
  reviewing: 'Reviewing the draft',
  revising: 'Applying edits',
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

export function PostCard({ post, calendarId, onClick, stage }: PostCardProps) {
  const approvePost = useApprovePost(calendarId)
  const unapprovePost = useUnapprovePost(calendarId)
  const rejectPost = useRejectPost(calendarId)
  const deletePost = useDeletePost(calendarId)
  const publishPost = usePublishPost(calendarId)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isGenerating = post.status === 'generating'
  const charCount = post.content?.length ?? 0

  // Action buttons live inside a card whose onClick navigates to the post
  // editor. Without this guard, clicks on action buttons (or even on the
  // backdrop after a modal closes) can bubble to the card and trigger
  // navigation — which is especially bad after delete (user lands on a 404).
  const stopAndRun = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }

  const submitReject = (reason: string) => {
    rejectPost.mutate(
      { postId: post._id, reason, profileId: post.profileId },
      { onSuccess: () => setRejectOpen(false) },
    )
  }

  const submitDelete = () => {
    deletePost.mutate(
      { postId: post._id },
      { onSuccess: () => setDeleteOpen(false) },
    )
  }

  return (
    <>
    <div
      className={cn(
        'group rounded-lg border p-4 transition-colors',
        isGenerating
          ? 'cursor-not-allowed opacity-60'
          : 'hover:border-primary/40 hover:bg-muted/50 cursor-pointer'
      )}
      onClick={isGenerating ? undefined : onClick}
      aria-disabled={isGenerating}
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
          {isGenerating && stage ? STAGE_LABEL[stage] : post.status}
        </Badge>
      </div>

      {post.status === 'needs_attention' && post.generationWarning && (
        <div className='mb-2 flex items-start gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'>
          <IconAlertTriangle className='mt-0.5 size-3 shrink-0' />
          <span className='line-clamp-2'>{post.generationWarning}</span>
        </div>
      )}

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
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => approvePost.mutate(post._id))}
                  disabled={approvePost.isPending}
                >
                  <IconCheck className='size-3.5 text-green-600' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Approve & schedule for posting
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setRejectOpen(true))}
                  disabled={rejectPost.isPending}
                >
                  <IconX className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reject & regenerate a replacement in this slot
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setDeleteOpen(true))}
                  disabled={deletePost.isPending}
                >
                  <IconTrash className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Permanently delete this post (no replacement)
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {post.status === 'failed' && (
          <div
            className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={stopAndRun(() => publishPost.mutate(post._id))}
              disabled={publishPost.isPending}
            >
              {publishPost.isPending ? (
                <IconLoader2 className='mr-1 size-3 animate-spin' />
              ) : (
                <IconSend className='mr-1 size-3' />
              )}
              Retry Publish
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setDeleteOpen(true))}
                  disabled={deletePost.isPending}
                >
                  <IconTrash className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Permanently delete this post (no replacement)
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {(post.status === 'approved' || post.status === 'scheduled') && (
          <div
            className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => unapprovePost.mutate(post._id))}
                  disabled={unapprovePost.isPending}
                >
                  {unapprovePost.isPending ? (
                    <IconLoader2 className='size-3.5 animate-spin' />
                  ) : (
                    <IconArrowBackUp className='size-3.5 text-amber-600' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Unapprove and move back to draft
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setRejectOpen(true))}
                  disabled={rejectPost.isPending}
                >
                  <IconX className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reject & regenerate a replacement in this slot
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setDeleteOpen(true))}
                  disabled={deletePost.isPending}
                >
                  <IconTrash className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Permanently delete this post (no replacement)
              </TooltipContent>
            </Tooltip>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={stopAndRun(() => publishPost.mutate(post._id))}
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

        {post.status === 'rejected' && (
          <div
            className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={stopAndRun(() => setDeleteOpen(true))}
                  disabled={deletePost.isPending}
                >
                  <IconTrash className='size-3.5 text-red-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Permanently delete this post (no replacement)
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

    </div>

      <RejectPostDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={submitReject}
        isPending={rejectPost.isPending}
      />

      <DeletePostDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={submitDelete}
        isPending={deletePost.isPending}
      />
    </>
  )
}
