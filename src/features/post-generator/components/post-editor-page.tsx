import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useActiveCalendars,
  useEditPost,
  useApprovePost,
  useRejectPost,
} from '../query/post-generator.query'
import { PostChatPanel } from './post-chat-panel'

function charCountColor(count: number) {
  if (count >= 1000 && count <= 1200) return 'text-green-600'
  if (count >= 800 && count <= 1300) return 'text-yellow-600'
  return 'text-red-500'
}

function statusLabel(status: string) {
  switch (status) {
    case 'ready':
      return 'Ready for review'
    case 'approved':
      return 'Approved'
    case 'published':
      return 'Published'
    case 'scheduled':
      return 'Scheduled'
    case 'generating':
      return 'Generating...'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
    case 'published':
      return 'default'
    case 'ready':
      return 'outline'
    case 'rejected':
      return 'destructive'
    case 'generating':
    case 'scheduled':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function PostEditorPage() {
  const { profileId, agentType: _agentType, postId } = useParams({ strict: false }) as {
    profileId: string
    agentType: string
    postId: string
  }
  const navigate = useNavigate()
  const { data: weeks } = useActiveCalendars(profileId)

  const weekList = (weeks as any[]) ?? []
  const matchedWeek = weekList.find((w: any) =>
    w.posts?.some((p: any) => p._id === postId)
  )
  const calendar = matchedWeek?.calendar
  const posts: any[] = matchedWeek?.posts ?? []
  const post = posts.find((p: any) => p._id === postId)
  const postIndex = posts.findIndex((p: any) => p._id === postId)

  const calendarId = calendar?._id ?? ''
  const editPost = useEditPost(calendarId)
  const approvePost = useApprovePost(calendarId)
  const rejectPost = useRejectPost(calendarId)

  const [content, setContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
    [post?.content],
  )

  const handleSave = () => {
    if (!post) return
    editPost.mutate(
      { postId: post._id, content },
      { onSuccess: () => setHasUnsavedChanges(false) },
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
            approvePost.mutate(post._id)
          },
        },
      )
    } else {
      approvePost.mutate(post._id)
    }
  }

  const handleReject = () => {
    if (!post) return
    rejectPost.mutate({
      postId: post._id,
      reason: 'Not aligned with goals',
      profileId,
    })
  }

  const handleChatUpdate = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(false)
  }, [])

  const goBack = () => {
    navigate({
      to: `/agents/$profileId/$agentType/calendar` as any,
    })
  }

  const goToPost = (id: string) => {
    navigate({
      to: `/agents/$profileId/$agentType/post/$postId` as any,
      params: { postId: id },
    } as any)
  }

  if (!post) {
    return (
      <div className='flex h-full flex-col'>
        <div className='flex shrink-0 items-center justify-between border-b px-4 py-3'>
          <div className='flex items-center gap-3'>
            <Skeleton className='size-8 rounded-md' />
            <Skeleton className='h-5 w-24 rounded-full' />
            <Skeleton className='h-5 w-20 rounded-full' />
          </div>
          <Skeleton className='h-5 w-16' />
        </div>
        <div className='flex min-h-0 flex-1'>
          <div className='flex flex-1 flex-col border-r p-6' style={{ flex: '55 0 0' }}>
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-11/12' />
            <Skeleton className='mb-4 h-4 w-4/5' />
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-3/4' />
            <Skeleton className='mb-4 h-4 w-5/6' />
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-2/3' />
          </div>
          <div className='flex flex-col p-6' style={{ flex: '45 0 0' }}>
            <Skeleton className='mb-4 h-6 w-28' />
            <Skeleton className='mb-3 h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        </div>
      </div>
    )
  }

  const charCount = content.length
  const prevPost = postIndex > 0 ? posts[postIndex - 1] : null
  const nextPost = postIndex < posts.length - 1 ? posts[postIndex + 1] : null

  return (
    <div className='flex h-full flex-col'>
      {/* Top bar */}
      <div className='flex shrink-0 items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' className='size-8' onClick={goBack}>
            <IconArrowLeft className='size-4' />
          </Button>
          <div className='flex items-center gap-2'>
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
            <Badge variant={statusVariant(post.status)} className='text-xs'>
              {statusLabel(post.status)}
            </Badge>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {prevPost && (
            <Button
              variant='ghost'
              size='sm'
              className='text-xs'
              onClick={() => goToPost(prevPost._id)}
            >
              ← Prev
            </Button>
          )}
          <span className='text-muted-foreground text-xs'>
            {postIndex + 1} / {posts.length}
          </span>
          {nextPost && (
            <Button
              variant='ghost'
              size='sm'
              className='text-xs'
              onClick={() => goToPost(nextPost._id)}
            >
              Next →
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className='flex min-h-0 flex-1'>
        {/* Editor */}
        <div className='flex flex-1 flex-col border-r' style={{ flex: '55 0 0' }}>
          <div className='flex-1 overflow-auto p-6'>
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
              {post.status === 'ready' && (
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
              <Button
                size='sm'
                onClick={handleApprove}
                disabled={approvePost.isPending || post.status === 'approved'}
              >
                <IconCheck className='mr-1.5 size-3.5' />
                Approve
              </Button>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className='flex flex-col' style={{ flex: '45 0 0' }}>
          <PostChatPanel
            post={post}
            calendarId={calendarId}
            onContentUpdate={handleChatUpdate}
          />
        </div>
      </div>
    </div>
  )
}
