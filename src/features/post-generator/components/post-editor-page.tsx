import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconFileTypePdf,
  IconLoader2,
  IconPaperclip,
  IconRefresh,
  IconRocket,
  IconSparkles,
  IconTrash,
  IconX,
  IconZoomIn,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { CarouselPayload, PostMedia } from '../api/post-generator.api'
import {
  useActiveCalendars,
  useApprovePost,
  useUnapprovePost,
  useCalendarStream,
  type ResearchClaim,
  useDeletePostMedia,
  useEditCarouselSlide,
  useEditPost,
  useFormatSuggestions,
  usePublishPost,
  useRegenerateAiImage,
  useRegenerateCarouselSlide,
  useRejectPost,
  useDeletePost,
  useReschedulePost,
  useSwitchCarouselTemplate,
  useUploadPostMedia,
} from '../query/post-generator.query'
import { STAGE_LABEL } from '../utils/stage-label'
import { CarouselStrip } from './carousel-strip'
import { DeletePostDialog } from './delete-post-dialog'
import { GenerationProgress, ResearchSources } from './generation-progress'
import { PostChatPanel } from './post-chat-panel'
import { RegenerateImageDialog } from './regenerate-image-dialog'
import { RejectPostDialog } from './reject-post-dialog'

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
  status: string
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
  const {
    profileId,
    agentType: _agentType,
    postId,
  } = useParams({ strict: false }) as {
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
  const unapprovePost = useUnapprovePost(calendarId)
  const rejectPost = useRejectPost(calendarId)
  const deletePost = useDeletePost(calendarId)
  const publishPost = usePublishPost(calendarId)
  const reschedulePost = useReschedulePost(calendarId)
  const uploadMedia = useUploadPostMedia(calendarId)
  const deleteMedia = useDeletePostMedia(calendarId)
  const regenerateAi = useRegenerateAiImage(calendarId)
  const editSlide = useEditCarouselSlide(calendarId)
  const regenerateSlide = useRegenerateCarouselSlide(calendarId)
  const switchTemplate = useSwitchCarouselTemplate(calendarId)
  const [regenTargetMediaId, setRegenTargetMediaId] = useState<string | null>(
    null
  )
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null)

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
  const aiImagePending = (() => {
    const fit = (post as any)?.imageFit as
      { type?: string; error?: string | null } | undefined
    const t = fit?.type
    const isAiImageKind =
      t === 'chat_screenshot' ||
      t === 'dashboard_screenshot' ||
      t === 'concept_illustration' ||
      t === 'trending_meme' ||
      t === 'handwritten_note'
    if (!isAiImageKind) return false
    if (fit?.error) return false
    return !media.some((m) => m.source === 'ai' && m.aiKind === t)
  })()
  const isGenerating = post?.status === 'generating'
  // The chat is the only one of these the page cannot see for itself, and the
  // edit agent's steps arrive on the same stream, so the panel says when it
  // needs the connection open.
  const [chatBusy, setChatBusy] = useState(false)
  const {
    stages,
    claims: streamedClaims,
    details,
  } = useCalendarStream(
    isGenerating || carouselInProgress || aiImagePending || chatBusy
      ? calendarId || undefined
      : undefined,
    profileId
  )
  const stage = isGenerating ? stages[postId] : undefined
  // The stream carries claims as they are found; the post carries them after a
  // reload, once the calendar has been refetched.
  const researchClaims: ResearchClaim[] =
    streamedClaims[postId] ?? (post as any)?.researchClaims ?? []

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
    setFormatDismissed(
      sessionStorage.getItem(`format-suggest-dismissed:${postId}`) === '1'
    )
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
    { type?: string; confidence?: number } | undefined
  const classifierDecidedNoImage =
    imageFit?.type === 'none' && (imageFit?.confidence ?? 0) > 0
  const classifierPickedImage =
    imageFit?.type === 'chat_screenshot' ||
    imageFit?.type === 'dashboard_screenshot' ||
    imageFit?.type === 'concept_illustration' ||
    imageFit?.type === 'trending_meme' ||
    imageFit?.type === 'handwritten_note'
  const suppressImageBannerByClassifier =
    classifierDecidedNoImage || classifierPickedImage

  const formatSuggestion = useFormatSuggestions(
    postId,
    debouncedCommentary,
    !formatDismissed &&
      !hasImages &&
      !hasPdf &&
      !suppressImageBannerByClassifier
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
    [post?.content]
  )

  const handleSave = () => {
    if (!post) return
    editPost.mutate(
      { postId: post._id, content },
      { onSuccess: () => setHasUnsavedChanges(false) }
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
        }
      )
    } else {
      approvePost.mutate(post._id)
    }
  }

  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleReject = () => {
    if (!post) return
    setRejectOpen(true)
  }

  const submitReject = (reason: string) => {
    if (!post) return
    rejectPost.mutate(
      { postId: post._id, reason, profileId },
      { onSuccess: () => setRejectOpen(false) }
    )
  }

  const handleDelete = () => {
    if (!post) return
    setDeleteOpen(true)
  }

  const submitDelete = () => {
    if (!post) return
    deletePost.mutate(
      { postId: post._id },
      {
        onSuccess: () => {
          setDeleteOpen(false)
          goBack()
        },
      }
    )
  }

  const handleUnapprove = () => {
    if (!post) return
    unapprovePost.mutate(post._id)
  }

  const [publishNowOpen, setPublishNowOpen] = useState(false)
  const handlePublishNowRequest = () => {
    if (!post) return
    setPublishNowOpen(true)
  }
  const confirmPublishNow = () => {
    if (!post) return
    if (hasUnsavedChanges) {
      editPost.mutate(
        { postId: post._id, content },
        {
          onSuccess: () => {
            setHasUnsavedChanges(false)
            publishPost.mutate(post._id, {
              onSuccess: () => setPublishNowOpen(false),
            })
          },
        }
      )
    } else {
      publishPost.mutate(post._id, {
        onSuccess: () => setPublishNowOpen(false),
      })
    }
  }

  const handleReschedule = (date: Date) => {
    if (!post) return
    reschedulePost.mutate({
      postId: post._id,
      scheduledAt: date.toISOString(),
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
    [post?._id, uploadMedia]
  )

  const handleAttachClick = (kind: 'image' | 'pdf') => {
    if (!fileInputRef.current) return
    fileInputRef.current.accept =
      kind === 'pdf'
        ? 'application/pdf'
        : 'image/png,image/jpeg,image/webp,image/gif'
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
      { onSettled: () => setRegenTargetMediaId(null) }
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
            { onSettled: () => setRegenTargetMediaId(null) }
          )
        },
        onError: () => setRegenTargetMediaId(null),
      }
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
          <div
            className='flex flex-1 flex-col border-r p-6'
            style={{ flex: '55 0 0' }}
          >
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-11/12' />
            <Skeleton className='mb-4 h-4 w-4/5' />
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-3/4' />
            <Skeleton className='mb-4 h-4 w-5/6' />
            <Skeleton className='mb-4 h-4 w-full' />
            <Skeleton className='mb-4 h-4 w-2/3' />
          </div>
          <div className='flex min-w-0 flex-col p-6' style={{ flex: '45 0 0' }}>
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
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            onClick={goBack}
          >
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
              {stage ? STAGE_LABEL[stage] : statusLabel(post.status)}
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
        <div
          className='flex min-w-0 flex-1 flex-col border-r'
          style={{ flex: '55 0 0' }}
        >
          <div className='min-w-0 flex-1 overflow-auto p-6'>
            {(post as any).generationWarning && (
              <GenerationWarningBanner
                status={post.status}
                message={(post as any).generationWarning}
              />
            )}
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
            {isGenerating && !content ? (
              <GenerationProgress
                stage={stage}
                detail={isGenerating ? details[postId] : undefined}
                claims={researchClaims}
              />
            ) : (
              <>
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className='min-h-[60vh] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
                  placeholder='Post content...'
                />
                {researchClaims.length > 0 && (
                  <ResearchSources claims={researchClaims} />
                )}
              </>
            )}
            {(() => {
              const carousel = (post as any)?.imageFit?.carousel as
                CarouselPayload | undefined
              const shouldShow =
                carousel &&
                ((carousel.slides?.length ?? 0) > 0 ||
                  carousel.status === 'generating' ||
                  carousel.status === 'assembling')
              if (carousel && shouldShow) {
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
                  onPreview={(id) => setPreviewMediaId(id)}
                  regeneratingMediaId={post?.regeneratingMediaId ?? null}
                  onAttachImages={() => handleAttachClick('image')}
                  onAttachPdf={() => handleAttachClick('pdf')}
                  imageSlotsRemaining={imageSlotsRemaining}
                  hasPdf={hasPdf}
                  hasImages={hasImages}
                  uploading={uploadMedia.isPending}
                  pendingAiImage={aiImagePending}
                />
              )
            })()}
            <ImageLightboxDialog
              media={media}
              activeId={previewMediaId}
              onClose={() => setPreviewMediaId(null)}
              onChangeId={(id) => setPreviewMediaId(id)}
              onRegenerate={(id) => {
                setPreviewMediaId(null)
                handleOpenRegen(id)
              }}
              onRemove={(id) => {
                setPreviewMediaId(null)
                handleRemoveMedia(id)
              }}
            />
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
                    {imageCount > 0 &&
                      `${imageCount} image${imageCount > 1 ? 's' : ''}`}
                    {pdfCount > 0 && `${imageCount > 0 ? ', ' : ''}PDF`}
                  </span>
                </>
              )}
              {aiImagePending && (
                <>
                  <Separator orientation='vertical' className='h-4' />
                  <span className='text-muted-foreground flex items-center gap-1'>
                    <IconLoader2 className='size-3 animate-spin' />
                    Generating image…
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
              {post.scheduledAt && (
                <>
                  <Separator orientation='vertical' className='h-4' />
                  <SchedulePill
                    scheduledAt={post.scheduledAt}
                    onChange={handleReschedule}
                    disabled={
                      reschedulePost.isPending ||
                      post.status === 'published' ||
                      post.status === 'rejected'
                    }
                    isPending={reschedulePost.isPending}
                  />
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
              {post.status !== 'published' && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleDelete}
                  disabled={deletePost.isPending}
                >
                  <IconTrash className='mr-1.5 size-3.5 text-red-500' />
                  Delete
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
                <SplitButton
                  primary={
                    <>
                      <IconArrowBackUp className='mr-1.5 size-3.5 text-amber-600' />
                      Unapprove
                    </>
                  }
                  variant='outline'
                  onPrimary={handleUnapprove}
                  primaryDisabled={unapprovePost.isPending}
                  menuItems={[
                    {
                      key: 'publish-now',
                      icon: <IconRocket className='size-3.5' />,
                      label: 'Publish now',
                      onClick: handlePublishNowRequest,
                      disabled: publishPost.isPending,
                    },
                  ]}
                />
              ) : post.status === 'ready' ||
                post.status === 'needs_attention' ? (
                <SplitButton
                  primary={
                    <>
                      <IconCheck className='mr-1.5 size-3.5' />
                      Approve
                    </>
                  }
                  onPrimary={handleApprove}
                  primaryDisabled={approvePost.isPending}
                  menuItems={[
                    {
                      key: 'publish-now',
                      icon: <IconRocket className='size-3.5' />,
                      label: 'Publish now',
                      onClick: handlePublishNowRequest,
                      disabled: publishPost.isPending,
                    },
                  ]}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className='flex min-w-0 flex-col' style={{ flex: '45 0 0' }}>
          <PostChatPanel
            post={post}
            calendarId={calendarId}
            profileId={profileId}
            onContentUpdate={handleChatUpdate}
            onBusyChange={setChatBusy}
          />
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

      <PublishNowConfirmDialog
        open={publishNowOpen}
        onOpenChange={setPublishNowOpen}
        onConfirm={confirmPublishNow}
        isPending={publishPost.isPending || editPost.isPending}
      />
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

function GenerationWarningBanner({
  status,
  message,
}: {
  status: string
  message: string
}) {
  // `needs_attention` is a hard failure (post wasn't promoted); `ready` with a
  // warning is a soft recovery (post was promoted with caveats). Color the
  // banner accordingly so users learn to triage at a glance.
  const isHardFail = status === 'needs_attention'
  const palette = isHardFail
    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
  const iconColor = isHardFail ? 'text-red-500' : 'text-amber-500'
  const title = isHardFail
    ? 'This post needs your attention'
    : 'Generation finished with a warning'

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${palette}`}
    >
      <IconAlertTriangle className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
      <div className='min-w-0 flex-1'>
        <div className='font-medium'>{title}</div>
        <div className='mt-0.5 break-words opacity-90'>{message}</div>
      </div>
    </div>
  )
}

function MediaStrip({
  media,
  onRemove,
  onRegenerate,
  onPreview,
  regeneratingMediaId,
  onAttachImages,
  onAttachPdf,
  imageSlotsRemaining,
  hasPdf,
  hasImages,
  uploading,
  pendingAiImage,
}: {
  media: PostMedia[]
  onRemove: (mediaId: string) => void
  onRegenerate?: (mediaId: string) => void
  onPreview?: (mediaId: string) => void
  regeneratingMediaId?: string | null
  onAttachImages: () => void
  onAttachPdf: () => void
  imageSlotsRemaining: number
  hasPdf: boolean
  hasImages: boolean
  uploading: boolean
  pendingAiImage?: boolean
}) {
  const canAttachImages = !hasPdf && imageSlotsRemaining > 0
  const canAttachPdf = !hasImages && !hasPdf

  return (
    <div className='mt-6 space-y-2'>
      {(media.length > 0 || pendingAiImage) && (
        <div className='flex flex-wrap gap-2'>
          {media.map((m) => (
            <MediaTile
              key={m._id}
              media={m}
              onRemove={onRemove}
              onRegenerate={onRegenerate}
              onPreview={onPreview}
              isRegenerating={String(regeneratingMediaId) === String(m._id)}
            />
          ))}
          {pendingAiImage && <PendingAiImageTile />}
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
          {hasImages
            ? `Add image (${imageSlotsRemaining} left)`
            : 'Attach images'}
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

function PendingAiImageTile() {
  return (
    <div className='group bg-muted/50 relative flex h-24 w-24 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed'>
      <span className='absolute top-1 left-1 rounded bg-violet-600/90 px-1 py-px text-[9px] font-medium tracking-wide text-white uppercase'>
        AI
      </span>
      <IconLoader2 className='text-muted-foreground size-5 animate-spin' />
      <span className='text-muted-foreground text-[9px] font-medium'>
        Generating…
      </span>
    </div>
  )
}

function MediaTile({
  media,
  onRemove,
  onRegenerate,
  onPreview,
  isRegenerating,
}: {
  media: PostMedia
  onRemove: (mediaId: string) => void
  onRegenerate?: (mediaId: string) => void
  onPreview?: (mediaId: string) => void
  isRegenerating?: boolean
}) {
  const isAi = media.source === 'ai'
  const previewable = media.type === 'image' && !!onPreview && !isRegenerating
  return (
    <div className='group bg-muted relative h-24 w-24 overflow-hidden rounded-md border'>
      {media.type === 'image' ? (
        <button
          type='button'
          onClick={previewable ? () => onPreview!(media._id) : undefined}
          aria-label='Preview image'
          className={cn('block h-full w-full', previewable && 'cursor-zoom-in')}
          disabled={!previewable}
        >
          <img
            src={media.url}
            alt={media.originalFilename}
            className={cn(
              'h-full w-full object-cover',
              isRegenerating && 'opacity-40'
            )}
          />
        </button>
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center'>
          <IconFileTypePdf className='size-7 text-red-500' />
          <span className='text-muted-foreground line-clamp-2 text-[10px]'>
            {media.originalFilename}
          </span>
        </div>
      )}
      {isAi && (
        <span className='pointer-events-none absolute top-1 left-1 rounded bg-violet-600/90 px-1 py-px text-[9px] font-medium tracking-wide text-white uppercase'>
          AI
        </span>
      )}
      {previewable && (
        <span className='pointer-events-none absolute inset-x-0 bottom-0 hidden items-center justify-center bg-black/50 py-0.5 text-white group-hover:flex'>
          <IconZoomIn className='size-3.5' />
        </span>
      )}
      {isRegenerating && (
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white'>
          <IconLoader2 className='size-5 animate-spin' />
          <span className='text-[9px] font-medium'>Remixing...</span>
        </div>
      )}
      {!isRegenerating && (
        <div className='absolute top-1 right-1 hidden gap-1 group-hover:flex'>
          {isAi && onRegenerate && (
            <button
              type='button'
              aria-label='Replace AI image'
              title='Replace this AI image'
              onClick={(e) => {
                e.stopPropagation()
                onRegenerate(media._id)
              }}
              className='rounded-full bg-black/70 p-0.5 text-white hover:bg-black'
            >
              <IconRefresh className='size-3' />
            </button>
          )}
          <button
            type='button'
            aria-label='Remove attachment'
            onClick={(e) => {
              e.stopPropagation()
              onRemove(media._id)
            }}
            className='rounded-full bg-black/70 p-0.5 text-white hover:bg-black'
          >
            <IconX className='size-3' />
          </button>
        </div>
      )}
    </div>
  )
}

function ImageLightboxDialog({
  media,
  activeId,
  onClose,
  onChangeId,
  onRegenerate,
  onRemove,
}: {
  media: PostMedia[]
  activeId: string | null
  onClose: () => void
  onChangeId: (id: string) => void
  onRegenerate: (id: string) => void
  onRemove: (id: string) => void
}) {
  const images = media.filter((m) => m.type === 'image')
  const index = activeId ? images.findIndex((m) => m._id === activeId) : -1
  const current = index >= 0 ? images[index] : null
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < images.length - 1

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) onChangeId(images[index - 1]._id)
      else if (e.key === 'ArrowRight' && hasNext)
        onChangeId(images[index + 1]._id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, hasPrev, hasNext, index, images, onChangeId])

  if (!current) return null
  const isAi = current.source === 'ai'

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className='max-w-3xl gap-4 p-4 sm:p-6'>
        <DialogHeader className='space-y-1 pr-8'>
          <DialogTitle className='flex min-w-0 items-center gap-2'>
            {isAi && (
              <span className='shrink-0 rounded bg-violet-600/90 px-1 py-px text-[9px] font-medium tracking-wide text-white uppercase'>
                AI
              </span>
            )}
            <span className='truncate'>
              {current.originalFilename || 'Image'}
            </span>
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {images.length > 1
              ? `Image ${index + 1} of ${images.length}`
              : 'Tap to view full size'}
          </DialogDescription>
        </DialogHeader>

        <div className='relative flex items-center justify-center'>
          {images.length > 1 && (
            <Button
              variant='outline'
              size='icon'
              className='absolute left-1 z-10 size-9 rounded-full shadow disabled:opacity-30'
              onClick={() => hasPrev && onChangeId(images[index - 1]._id)}
              disabled={!hasPrev}
              aria-label='Previous image'
            >
              <IconChevronLeft className='size-5' />
            </Button>
          )}

          <div className='bg-muted flex max-h-[70vh] w-full items-center justify-center overflow-hidden rounded-lg border'>
            <img
              src={current.url}
              alt={current.originalFilename}
              className='max-h-[70vh] w-auto max-w-full object-contain'
            />
          </div>

          {images.length > 1 && (
            <Button
              variant='outline'
              size='icon'
              className='absolute right-1 z-10 size-9 rounded-full shadow disabled:opacity-30'
              onClick={() => hasNext && onChangeId(images[index + 1]._id)}
              disabled={!hasNext}
              aria-label='Next image'
            >
              <IconChevronRight className='size-5' />
            </Button>
          )}
        </div>

        {images.length > 1 && (
          <div className='flex justify-center gap-1.5'>
            {images.map((m, i) => (
              <button
                key={m._id}
                type='button'
                onClick={() => onChangeId(m._id)}
                aria-label={`Go to image ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index
                    ? 'bg-foreground w-6'
                    : 'bg-muted-foreground/30 w-1.5'
                )}
              />
            ))}
          </div>
        )}

        <DialogFooter className='flex-row justify-end gap-2 sm:justify-end'>
          {isAi && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => onRegenerate(current._id)}
            >
              <IconRefresh className='mr-1.5 size-3.5' />
              Regenerate
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            className='text-red-600 hover:bg-red-50 hover:text-red-700'
            onClick={() => onRemove(current._id)}
          >
            <IconTrash className='mr-1.5 size-3.5' />
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SchedulePill({
  scheduledAt,
  onChange,
  disabled,
  isPending,
}: {
  scheduledAt: string | Date
  onChange: (next: Date) => void
  disabled?: boolean
  isPending?: boolean
}) {
  const [open, setOpen] = useState(false)
  const initial = useMemo(() => new Date(scheduledAt), [scheduledAt])

  const [draftDate, setDraftDate] = useState<Date | undefined>(initial)
  const [draftTime, setDraftTime] = useState<string>(() =>
    format(initial, 'HH:mm')
  )

  useEffect(() => {
    if (!open) return
    setDraftDate(initial)
    setDraftTime(format(initial, 'HH:mm'))
  }, [open, initial])

  const dirty = useMemo(() => {
    if (!draftDate) return false
    const [h, m] = draftTime.split(':').map((v) => parseInt(v, 10))
    const composed = new Date(draftDate)
    composed.setHours(h || 0, m || 0, 0, 0)
    return composed.getTime() !== initial.getTime()
  }, [draftDate, draftTime, initial])

  const handleSave = () => {
    if (!draftDate) return
    const [h, m] = draftTime.split(':').map((v) => parseInt(v, 10))
    const composed = new Date(draftDate)
    composed.setHours(h || 0, m || 0, 0, 0)
    if (composed.getTime() === initial.getTime()) {
      setOpen(false)
      return
    }
    onChange(composed)
    setOpen(false)
  }

  const display = format(initial, "EEE MMM d 'at' h:mm a")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          disabled={disabled}
          className={cn(
            'text-muted-foreground inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium transition-colors',
            'hover:border-border hover:bg-muted/60 hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-transparent disabled:hover:bg-transparent'
          )}
          aria-label='Reschedule post'
        >
          {isPending ? (
            <IconLoader2 className='size-3 animate-spin' />
          ) : (
            <IconCalendar className='size-3.5' />
          )}
          <span>{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto p-0'>
        <Calendar
          mode='single'
          selected={draftDate}
          onSelect={(d) => d && setDraftDate(d)}
          disabled={(d) => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return d < today
          }}
        />
        <div className='border-t p-3'>
          <label className='text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium'>
            <IconCalendar className='size-3.5' />
            Time
          </label>
          <input
            type='time'
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            className='border-input focus-visible:ring-ring h-9 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:outline-hidden'
          />
          <div className='mt-3 flex justify-end gap-2'>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setOpen(false)}
              className='h-8 text-xs'
            >
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={handleSave}
              disabled={!dirty || !draftDate}
              className='h-8 text-xs'
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface SplitButtonMenuItem {
  key: string
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}

function SplitButton({
  primary,
  onPrimary,
  primaryDisabled,
  menuItems,
  variant = 'default',
}: {
  primary: React.ReactNode
  onPrimary: () => void
  primaryDisabled?: boolean
  menuItems: SplitButtonMenuItem[]
  variant?: 'default' | 'outline'
}) {
  return (
    <div className='inline-flex'>
      <Button
        size='sm'
        variant={variant}
        onClick={onPrimary}
        disabled={primaryDisabled}
        className='rounded-r-none'
      >
        {primary}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size='sm'
            variant={variant}
            disabled={primaryDisabled}
            className='-ml-px rounded-l-none px-1.5'
            aria-label='More actions'
          >
            <IconChevronDown className='size-3.5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function PublishNowConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconRocket className='size-4 text-amber-600' />
            Publish to LinkedIn now?
          </DialogTitle>
          <DialogDescription>
            This skips the scheduled time and publishes immediately. Once it's
            live on LinkedIn it can't be undone from here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size='sm' onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <IconLoader2 className='mr-1.5 size-3.5 animate-spin' />
                Publishing…
              </>
            ) : (
              <>
                <IconRocket className='mr-1.5 size-3.5' />
                Yes, publish now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
