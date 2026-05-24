import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconFileTypePdf,
  IconLoader2,
  IconPaperclip,
  IconRefresh,
  IconSparkles,
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
  useApprovePost,
  useCalendarStream,
  useDeletePostMedia,
  useEditCarouselSlide,
  useEditPost,
  useFormatSuggestions,
  useRegenerateAiImage,
  useRegenerateCarouselSlide,
  useRejectPost,
  useSwitchCarouselTemplate,
  useUploadPostMedia,
} from '../query/post-generator.query'
import type { CarouselPayload, PostMedia } from '../api/post-generator.api'
import { PostChatPanel } from './post-chat-panel'
import { RegenerateImageDialog } from './regenerate-image-dialog'
import { CarouselStrip } from './carousel-strip'

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
  const uploadMedia = useUploadPostMedia(calendarId)
  const deleteMedia = useDeletePostMedia(calendarId)
  const regenerateAi = useRegenerateAiImage(calendarId)
  const editSlide = useEditCarouselSlide(calendarId)
  const regenerateSlide = useRegenerateCarouselSlide(calendarId)
  const switchTemplate = useSwitchCarouselTemplate(calendarId)
  const [regenTargetMediaId, setRegenTargetMediaId] = useState<string | null>(
    null,
  )

  const media: PostMedia[] = post?.media ?? []
  const imageCount = media.filter((m) => m.type === 'image').length
  const pdfCount = media.filter((m) => m.type === 'pdf').length
  const hasPdf = pdfCount > 0
  const hasImages = imageCount > 0
  const imageSlotsRemaining = Math.max(0, 9 - imageCount)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carouselInProgress = (() => {
    const c = (post as any)?.imageFit?.carousel as CarouselPayload | undefined
    if (!c) return false
    return c.status !== 'ready' && c.status !== 'failed'
  })()
  useCalendarStream(
    post?.status === 'generating' || carouselInProgress
      ? calendarId || undefined
      : undefined,
    profileId,
  )

  const [content, setContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [debouncedCommentary, setDebouncedCommentary] = useState('')
  const dismissKey = postId ? `format-suggest-dismissed:${postId}` : ''
  const [formatDismissed, setFormatDismissed] = useState<boolean>(() => {
    if (!dismissKey) return false
    return sessionStorage.getItem(dismissKey) === '1'
  })

  useEffect(() => {
    if (!postId) return
    setFormatDismissed(sessionStorage.getItem(`format-suggest-dismissed:${postId}`) === '1')
  }, [postId])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCommentary(content), 1500)
    return () => clearTimeout(t)
  }, [content])

  // The smart image-fit classifier runs at generation time and stores its
  // decision on `post.imageFit`. If it deliberately decided "none" (any
  // non-zero confidence means a real LLM call returned, not a fallback),
  // suppress the older format-suggestion banner — it would only re-litigate
  // a decision the system has already made. Same when the classifier already
  // picked an image kind (the generator handles attachment automatically).
  const imageFit = post?.imageFit as
    | { type?: string; confidence?: number }
    | undefined
  const classifierDecidedNoImage =
    imageFit?.type === 'none' && (imageFit?.confidence ?? 0) > 0
  const classifierPickedImage =
    imageFit?.type === 'chat_screenshot' ||
    imageFit?.type === 'dashboard_screenshot'
  const suppressImageBannerByClassifier =
    classifierDecidedNoImage || classifierPickedImage

  const formatSuggestion = useFormatSuggestions(
    postId,
    debouncedCommentary,
    !formatDismissed && !hasImages && !hasPdf && !suppressImageBannerByClassifier,
  )
  const suggestion = formatSuggestion.data

  const dismissFormatSuggestion = useCallback(() => {
    if (!dismissKey) return
    sessionStorage.setItem(dismissKey, '1')
    setFormatDismissed(true)
  }, [dismissKey])

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

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !post?._id) return
      const arr = Array.from(files)
      if (arr.length === 0) return
      uploadMedia.mutate({ postId: post._id, files: arr })
    },
    [post?._id, uploadMedia],
  )

  const handleAttachClick = (kind: 'image' | 'pdf') => {
    if (!fileInputRef.current) return
    fileInputRef.current.accept =
      kind === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/webp,image/gif'
    fileInputRef.current.multiple = kind === 'image'
    fileInputRef.current.click()
  }

  const handleRemoveMedia = (mediaId: string) => {
    if (!post?._id) return
    deleteMedia.mutate({ postId: post._id, mediaId })
  }

  const queryClient = useQueryClient()
  const regenInFlight = Boolean(post?.regeneratingMediaId)
  useEffect(() => {
    if (!regenInFlight) return
    const id = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['post-gen-active-calendars', profileId],
      })
    }, 20000)
    return () => clearInterval(id)
  }, [regenInFlight, profileId, queryClient])

  const handleOpenRegen = (mediaId: string) => {
    setRegenTargetMediaId(mediaId)
  }
  const closeRegenDialog = () => {
    if (regenerateAi.isPending || uploadMedia.isPending) return
    setRegenTargetMediaId(null)
  }
  const handleRegenSubmit = (instruction: string) => {
    if (!post?._id || !regenTargetMediaId) return
    regenerateAi.mutate(
      { postId: post._id, mediaId: regenTargetMediaId, instruction },
      { onSettled: () => setRegenTargetMediaId(null) },
    )
  }
  const handleRegenUploadReplace = (file: File) => {
    if (!post?._id || !regenTargetMediaId) return
    const targetId = regenTargetMediaId
    deleteMedia.mutate(
      { postId: post._id, mediaId: targetId },
      {
        onSuccess: () => {
          uploadMedia.mutate(
            { postId: post._id, files: [file] },
            { onSettled: () => setRegenTargetMediaId(null) },
          )
        },
        onError: () => setRegenTargetMediaId(null),
      },
    )
  }
  const regenTargetMedia: PostMedia | null = regenTargetMediaId
    ? (media.find((m) => m._id === regenTargetMediaId) ?? null)
    : null

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return
    if (suggestion.suggestion === 'image') handleAttachClick('image')
    else if (suggestion.suggestion === 'pdf') handleAttachClick('pdf')
  }, [suggestion])

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
            {suggestion &&
              suggestion.suggestion !== 'none' &&
              !formatDismissed &&
              !suppressImageBannerByClassifier && (
                <FormatSuggestionBanner
                  suggestion={suggestion}
                  onAccept={acceptSuggestion}
                  onDismiss={dismissFormatSuggestion}
                />
              )}
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className='min-h-[60vh] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
              placeholder='Post content...'
            />
            {(() => {
              const carousel = (post as any)?.imageFit?.carousel as
                | CarouselPayload
                | undefined
              if (carousel?.slides?.length) {
                return (
                  <CarouselStrip
                    carousel={carousel}
                    media={media}
                    isMutating={
                      editSlide.isPending ||
                      regenerateSlide.isPending ||
                      switchTemplate.isPending
                    }
                    onEditSlide={(slideIndex, instruction) =>
                      post?._id &&
                      editSlide.mutate({
                        postId: post._id,
                        slideIndex,
                        instruction,
                      })
                    }
                    onRegenerateSlide={(slideIndex, overrides) =>
                      post?._id &&
                      regenerateSlide.mutate({
                        postId: post._id,
                        slideIndex,
                        overrides,
                      })
                    }
                    onSwitchTemplate={(styleKey) =>
                      post?._id &&
                      switchTemplate.mutate({ postId: post._id, styleKey })
                    }
                  />
                )
              }
              return (
                <MediaStrip
                  media={media}
                  onRemove={handleRemoveMedia}
                  onRegenerate={handleOpenRegen}
                  regeneratingMediaId={post?.regeneratingMediaId ?? null}
                  onAttachImages={() => handleAttachClick('image')}
                  onAttachPdf={() => handleAttachClick('pdf')}
                  imageSlotsRemaining={imageSlotsRemaining}
                  hasPdf={hasPdf}
                  hasImages={hasImages}
                  uploading={uploadMedia.isPending}
                />
              )
            })()}
            <RegenerateImageDialog
              open={regenTargetMediaId !== null}
              onOpenChange={(o) => (o ? null : closeRegenDialog())}
              media={regenTargetMedia}
              onRegenerate={handleRegenSubmit}
              onReplaceUpload={handleRegenUploadReplace}
              isRegenerating={regenerateAi.isPending}
              isUploading={uploadMedia.isPending || deleteMedia.isPending}
            />
            <input
              ref={fileInputRef}
              type='file'
              className='hidden'
              onChange={(e) => {
                handleFiles(e.target.files)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            />
          </div>
          <div className='flex shrink-0 items-center justify-between border-t px-4 py-3'>
            <div className='flex items-center gap-3 text-xs'>
              <span className={cn('font-medium', charCountColor(charCount))}>
                {charCount} chars
              </span>
              {media.length > 0 && (
                <>
                  <Separator orientation='vertical' className='h-4' />
                  <span className='text-muted-foreground'>
                    {imageCount > 0 && `${imageCount} image${imageCount > 1 ? 's' : ''}`}
                    {pdfCount > 0 && `${imageCount > 0 ? ', ' : ''}PDF`}
                  </span>
                </>
              )}
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
                disabled={
                  approvePost.isPending ||
                  post.status === 'approved'
                }
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

function FormatSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: { suggestion: 'image' | 'pdf' | 'none'; reason: string }
  onAccept: () => void
  onDismiss: () => void
}) {
  const label =
    suggestion.suggestion === 'pdf'
      ? 'Try a PDF carousel'
      : 'Try adding an image'
  return (
    <div className='mb-4 flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs'>
      <IconSparkles className='mt-0.5 size-4 shrink-0 text-indigo-500' />
      <div className='flex-1'>
        <div className='font-medium text-indigo-900'>{label}</div>
        <div className='mt-0.5 text-indigo-800/80'>{suggestion.reason}</div>
      </div>
      <Button
        size='sm'
        variant='outline'
        className='h-7 border-indigo-300 text-xs text-indigo-700 hover:bg-indigo-100'
        onClick={onAccept}
      >
        Attach
      </Button>
      <Button
        size='icon'
        variant='ghost'
        className='size-7 text-indigo-700 hover:bg-indigo-100'
        onClick={onDismiss}
        aria-label='Dismiss suggestion'
      >
        <IconX className='size-3.5' />
      </Button>
    </div>
  )
}

function MediaStrip({
  media,
  onRemove,
  onRegenerate,
  regeneratingMediaId,
  onAttachImages,
  onAttachPdf,
  imageSlotsRemaining,
  hasPdf,
  hasImages,
  uploading,
}: {
  media: PostMedia[]
  onRemove: (mediaId: string) => void
  onRegenerate?: (mediaId: string) => void
  regeneratingMediaId?: string | null
  onAttachImages: () => void
  onAttachPdf: () => void
  imageSlotsRemaining: number
  hasPdf: boolean
  hasImages: boolean
  uploading: boolean
}) {
  const canAttachImages = !hasPdf && imageSlotsRemaining > 0
  const canAttachPdf = !hasImages && !hasPdf

  return (
    <div className='mt-6 space-y-2'>
      {media.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {media.map((m) => (
            <MediaTile
              key={m._id}
              media={m}
              onRemove={onRemove}
              onRegenerate={onRegenerate}
              isRegenerating={String(regeneratingMediaId) === String(m._id)}
            />
          ))}
        </div>
      )}
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs'
          onClick={onAttachImages}
          disabled={!canAttachImages || uploading}
        >
          <IconPaperclip className='mr-1.5 size-3.5' />
          {hasImages ? `Add image (${imageSlotsRemaining} left)` : 'Attach images'}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs'
          onClick={onAttachPdf}
          disabled={!canAttachPdf || uploading}
        >
          <IconFileTypePdf className='mr-1.5 size-3.5' />
          Attach PDF
        </Button>
        {uploading && (
          <span className='text-muted-foreground text-xs'>Uploading...</span>
        )}
      </div>
    </div>
  )
}

function MediaTile({
  media,
  onRemove,
  onRegenerate,
  isRegenerating,
}: {
  media: PostMedia
  onRemove: (mediaId: string) => void
  onRegenerate?: (mediaId: string) => void
  isRegenerating?: boolean
}) {
  const isAi = media.source === 'ai'
  return (
    <div className='group relative h-24 w-24 overflow-hidden rounded-md border bg-muted'>
      {media.type === 'image' ? (
        <img
          src={media.url}
          alt={media.originalFilename}
          className={cn(
            'h-full w-full object-cover',
            isRegenerating && 'opacity-40',
          )}
        />
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center'>
          <IconFileTypePdf className='size-7 text-red-500' />
          <span className='line-clamp-2 text-[10px] text-muted-foreground'>
            {media.originalFilename}
          </span>
        </div>
      )}
      {isAi && (
        <span className='absolute left-1 top-1 rounded bg-violet-600/90 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-white'>
          AI
        </span>
      )}
      {isRegenerating && (
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white'>
          <IconLoader2 className='size-5 animate-spin' />
          <span className='text-[9px] font-medium'>Remixing...</span>
        </div>
      )}
      {!isRegenerating && (
        <div className='absolute right-1 top-1 hidden gap-1 group-hover:flex'>
          {isAi && onRegenerate && (
            <button
              type='button'
              aria-label='Replace AI image'
              title='Replace this AI image'
              onClick={() => onRegenerate(media._id)}
              className='rounded-full bg-black/70 p-0.5 text-white hover:bg-black'
            >
              <IconRefresh className='size-3' />
            </button>
          )}
          <button
            type='button'
            aria-label='Remove attachment'
            onClick={() => onRemove(media._id)}
            className='rounded-full bg-black/70 p-0.5 text-white hover:bg-black'
          >
            <IconX className='size-3' />
          </button>
        </div>
      )}
    </div>
  )
}
