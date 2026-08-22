import {
  ArrowUpRight,
  CheckCircle2,
  Heart,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { PreviewDraft } from '../api/preview.api'
import { useIsClamped } from '../hooks/useIsClamped'

interface PreviewDraftsProps {
  drafts: PreviewDraft[]
  selected: string[]
  publishedUrns: string[]
  maxSelectable: number
  publishing: boolean
  /**
   * Nothing here can be posted yet, so the drafts are shown to be read rather
   * than chosen from. Without this the cards keep their checkboxes and the
   * "at the limit" dimming, which reads as five broken controls instead of a
   * sample of the agent's work.
   */
  locked: boolean
  onToggle: (activityUrn: string) => void
  onSelectMax: () => void
  onClearSelection: () => void
  onPublish: () => void
}

function initialsOf(name?: string) {
  if (!name) return 'in'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * Deciding whether a comment is worth your name usually means checking who you
 * would be saying it to, so the name goes where that check starts.
 */
function AuthorName({
  name,
  profileUrl,
}: {
  name?: string
  profileUrl?: string
}) {
  const label = name || 'Someone on LinkedIn'

  if (!profileUrl) {
    return <p className='truncate text-sm font-semibold'>{label}</p>
  }

  return (
    <a
      href={profileUrl}
      target='_blank'
      rel='noreferrer'
      className='hover:text-primary block truncate text-sm font-semibold hover:underline'
    >
      {label}
    </a>
  )
}

/**
 * The excerpt is clamped, so the link has to say which of two things it does:
 * finish a post that was cut off, or open one that is already shown in full.
 * Offering "show more" on a short post is a promise of text that does not
 * exist, so the clamp is measured rather than guessed from length.
 */
function PostExcerpt({
  content,
  postUrl,
  numLikes,
  numComments,
}: {
  content: string
  postUrl?: string
  numLikes?: number
  numComments?: number
}) {
  const { ref, clamped } = useIsClamped<HTMLParagraphElement>(content)

  const hasStats = Boolean(numLikes || numComments)

  return (
    <div className='space-y-1.5'>
      <p
        ref={ref}
        className='text-muted-foreground line-clamp-3 text-xs leading-relaxed'
      >
        {content}
      </p>

      {(postUrl || hasStats) && (
        <div className='flex items-center justify-between gap-3'>
          {postUrl ? (
            <a
              href={postUrl}
              target='_blank'
              rel='noreferrer'
              className='text-primary inline-flex items-center gap-0.5 text-xs font-medium hover:underline'
            >
              {clamped ? 'Show more on LinkedIn' : 'Open the post on LinkedIn'}
              <ArrowUpRight className='h-3.5 w-3.5' />
            </a>
          ) : (
            <span />
          )}

          {hasStats && (
            <div className='text-muted-foreground flex items-center gap-3 text-[11px]'>
              {numLikes ? (
                <span className='flex items-center gap-1'>
                  <Heart className='h-3 w-3' />
                  {numLikes}
                </span>
              ) : null}
              {numComments ? (
                <span className='flex items-center gap-1'>
                  <MessageCircle className='h-3 w-3' />
                  {numComments}
                </span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Every draft names a real person and quotes a real post, so the reply has to
 * be checkable against its source in one click - the user is about to put their
 * name on it, and a comment that reads well in isolation can still be wrong
 * about the post it answers.
 */
export function PreviewDrafts({
  drafts,
  selected,
  publishedUrns,
  maxSelectable,
  publishing,
  locked,
  onToggle,
  onSelectMax,
  onClearSelection,
  onPublish,
}: PreviewDraftsProps) {
  const atLimit = selected.length >= maxSelectable
  const unpublished = drafts.filter(
    (d) => !publishedUrns.includes(d.activityUrn)
  )
  const selectableNow = Math.min(maxSelectable, unpublished.length)
  const canSelectMore = selected.length < selectableNow

  return (
    <div className='space-y-3'>
      {selectableNow > 0 && (
        <div className='flex items-center justify-between gap-2'>
          <p className='text-muted-foreground text-xs'>
            {selected.length
              ? `${selected.length} of ${maxSelectable} picked`
              : `Pick up to ${maxSelectable}, or take the lot live in one go`}
          </p>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-7 text-xs'
            onClick={selected.length ? onClearSelection : onSelectMax}
            disabled={publishing || (!selected.length && !canSelectMore)}
          >
            {selected.length ? 'Clear' : `Select ${selectableNow}`}
          </Button>
        </div>
      )}

      <div className='space-y-3'>
        {drafts.map((draft) => {
          const isPublished = publishedUrns.includes(draft.activityUrn)
          const isSelected = selected.includes(draft.activityUrn)
          const blocked = !locked && !isSelected && atLimit
          const interactive = !locked && !isPublished && !blocked && !publishing

          return (
            <div
              key={draft.activityUrn}
              // The card is a convenience target on top of the checkbox, which
              // stays the real control for keyboard and screen readers. Clicks
              // that started on the LinkedIn link are left alone, or opening
              // the post would silently toggle the comment too.
              onClick={(event) => {
                if (!interactive) return
                if ((event.target as HTMLElement).closest('a')) return
                onToggle(draft.activityUrn)
              }}
              className={`rounded-xl border transition-all ${
                isPublished
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                  : isSelected
                    ? 'border-primary ring-primary/20 shadow-sm ring-2'
                    : 'border-border hover:border-muted-foreground/30'
              } ${blocked && !isPublished ? 'opacity-50' : ''} ${
                interactive ? 'cursor-pointer' : ''
              }`}
            >
              <div className='flex items-start gap-3 p-4'>
                {isPublished ? (
                  <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400' />
                ) : locked ? null : (
                  <Checkbox
                    checked={isSelected}
                    disabled={blocked || publishing}
                    onCheckedChange={() => onToggle(draft.activityUrn)}
                    aria-label={`Post this comment on ${
                      draft.authorName ?? 'this'
                    }'s post`}
                    className='mt-1'
                  />
                )}

                <div className='min-w-0 flex-1 space-y-2.5'>
                  <div className='flex items-center gap-2.5'>
                    <Avatar className='h-8 w-8'>
                      {draft.authorImage && (
                        <AvatarImage
                          src={draft.authorImage}
                          alt={draft.authorName ?? ''}
                        />
                      )}
                      <AvatarFallback className='text-[11px] font-medium'>
                        {initialsOf(draft.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <AuthorName
                        name={draft.authorName}
                        profileUrl={draft.authorProfileUrl}
                      />
                      {draft.authorHeadline && (
                        <p className='text-muted-foreground truncate text-xs'>
                          {draft.authorHeadline}
                        </p>
                      )}
                    </div>
                  </div>

                  <PostExcerpt
                    content={draft.content}
                    postUrl={draft.postUrl}
                    numLikes={draft.numLikes}
                    numComments={draft.numComments}
                  />

                  <div className='border-primary/30 bg-muted/50 rounded-lg border-l-2 px-3 py-2.5'>
                    <p className='text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase'>
                      {isPublished ? 'Live on LinkedIn' : 'Your comment'}
                    </p>
                    <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                      {draft.comment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className='bg-background/95 sticky bottom-0 pt-2 pb-1 backdrop-blur'>
          <Button
            type='button'
            className='w-full'
            size='lg'
            onClick={onPublish}
            disabled={publishing}
          >
            {publishing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Posting to LinkedIn&hellip;
              </>
            ) : (
              <>
                <Send className='mr-2 h-4 w-4' />
                Post {selected.length}{' '}
                {selected.length === 1 ? 'comment' : 'comments'} live
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
