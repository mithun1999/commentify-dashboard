import { useState, useEffect, useCallback } from 'react'
import { IconArrowBackUp, IconCheck, IconDeviceFloppy, IconX } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  useEditPost,
  useApprovePost,
  useUnapprovePost,
  useRejectPost,
} from '../query/post-generator.query'
import { PostChatPanel } from './post-chat-panel'
import { RejectPostDialog } from './reject-post-dialog'

interface PostEditorDialogProps {
  post: any
  calendarId: string
  profileId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function charCountColor(count: number) {
  if (count >= 1000 && count <= 1200) return 'text-green-600'
  if (count >= 800 && count <= 1300) return 'text-yellow-600'
  return 'text-red-500'
}

export function PostEditorDialog({
  post,
  calendarId,
  profileId,
  open,
  onOpenChange,
}: PostEditorDialogProps) {
  const [content, setContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const editPost = useEditPost(calendarId)
  const approvePost = useApprovePost(calendarId)
  const unapprovePost = useUnapprovePost(calendarId)
  const rejectPost = useRejectPost(calendarId)

  useEffect(() => {
    if (post?.content) {
      setContent(post.content)
      setHasUnsavedChanges(false)
    }
  }, [post?.content, post?._id])

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value)
      setHasUnsavedChanges(value !== post?.content)
    },
    [post?.content]
  )

  const handleSave = () => {
    if (!post) return
    editPost.mutate(
      { postId: post._id, content },
      {
        onSuccess: () => setHasUnsavedChanges(false),
      }
    )
  }

  const handleApprove = () => {
    if (!post) return
    if (hasUnsavedChanges) {
      editPost.mutate(
        { postId: post._id, content },
        {
          onSuccess: () => {
            setHasUnsavedChanges(false)
            approvePost.mutate(post._id, {
              onSuccess: () => onOpenChange(false),
            })
          },
        }
      )
    } else {
      approvePost.mutate(post._id, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  const handleUnapprove = () => {
    if (!post) return
    unapprovePost.mutate(post._id)
  }

  const handleReject = () => {
    if (!post) return
    setRejectOpen(true)
  }

  const submitReject = (reason: string) => {
    if (!post) return
    rejectPost.mutate(
      { postId: post._id, reason, profileId },
      {
        onSuccess: () => {
          setRejectOpen(false)
          onOpenChange(false)
        },
      },
    )
  }

  const handleChatUpdate = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(false)
  }, [])

  if (!post) return null

  const charCount = content.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='flex h-[90vh] max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 p-0'
        hideCloseButton={false}
      >
        <DialogHeader className='shrink-0 border-b px-6 py-4'>
          <div className='flex items-center gap-3'>
            <DialogTitle className='text-base'>Edit Post</DialogTitle>
            {post.topic && (
              <Badge variant='outline' className='text-xs font-normal'>
                {post.topic}
              </Badge>
            )}
            {post.pillar && (
              <Badge variant='secondary' className='text-xs font-normal'>
                {post.pillar}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className='flex min-h-0 flex-1'>
          <div className='flex flex-1 flex-col border-r' style={{ flex: '55 0 0' }}>
            <div className='flex-1 overflow-auto p-4'>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className='min-h-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
                placeholder='Post content...'
              />
            </div>
            <div className='flex shrink-0 items-center justify-between border-t px-4 py-3'>
              <div className='flex items-center gap-3 text-xs'>
                <span className={cn('font-medium', charCountColor(charCount))}>
                  {charCount} chars
                </span>
                {post.overallScore != null && (
                  <>
                    <Separator orientation='vertical' className='h-4' />
                    <span className='text-muted-foreground'>
                      Score: {post.overallScore.toFixed(1)}
                    </span>
                  </>
                )}
                {hasUnsavedChanges && (
                  <>
                    <Separator orientation='vertical' className='h-4' />
                    <span className='text-amber-600'>Unsaved changes</span>
                  </>
                )}
              </div>
              <div className='flex items-center gap-2'>
                {(post.status === 'ready' ||
                  post.status === 'approved' ||
                  post.status === 'scheduled' ||
                  post.status === 'needs_attention') && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleReject}
                    disabled={rejectPost.isPending}
                  >
                    <IconX className='mr-1.5 size-3.5 text-red-500' />
                    Reject
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || editPost.isPending}
                >
                  <IconDeviceFloppy className='mr-1.5 size-3.5' />
                  Save
                </Button>
                {post.status === 'approved' || post.status === 'scheduled' ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleUnapprove}
                    disabled={unapprovePost.isPending}
                  >
                    <IconArrowBackUp className='mr-1.5 size-3.5 text-amber-600' />
                    Unapprove
                  </Button>
                ) : (
                  <Button
                    size='sm'
                    onClick={handleApprove}
                    disabled={approvePost.isPending}
                  >
                    <IconCheck className='mr-1.5 size-3.5' />
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className='flex flex-col' style={{ flex: '45 0 0' }}>
            <PostChatPanel
              post={post}
              calendarId={calendarId}
              onContentUpdate={handleChatUpdate}
            />
          </div>
        </div>
      </DialogContent>

      <RejectPostDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={submitReject}
        isPending={rejectPost.isPending}
      />
    </Dialog>
  )
}
