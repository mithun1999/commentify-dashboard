import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { IconArrowRight, IconLoader2 } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { splitThread } from '@/features/post-generator/utils/x-text'
import type { MirrorPostSummary } from '../api/profile-links.api'
import {
  useCreatePostMirror,
  usePostMirror,
  useProfileLinks,
} from '../query/profile-links.query'
import {
  LinkProfilesDialog,
  PlatformIcon,
  type LinkDialogTarget,
} from './link-profiles-dialog'

const STATUS_LABEL: Record<string, string> = {
  generating: 'Writing',
  ready: 'Ready for review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  needs_attention: 'Needs attention',
}

/** Where a LinkedIn post's status lets it have an X version. */
const MIRRORABLE = new Set(['ready', 'approved', 'scheduled'])

/**
 * Post editor: on a LinkedIn post, its X version (or the way to get one);
 * on an X version, the LinkedIn post it came from.
 */
export function XVersionCard({
  post,
}: {
  post: { _id: string; status: string; platform?: string; profileId?: string }
}) {
  const { data } = usePostMirror(post._id)
  const { data: links } = useProfileLinks(data?.role === 'source')
  const create = useCreatePostMirror(post._id)
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)

  if (!data || data.role === 'none') return null

  if (data.role === 'mirror') {
    if (!data.source) return null
    return (
      <Shell platform='linkedin' title='X version of your LinkedIn post'>
        <p className='text-muted-foreground line-clamp-2 text-xs'>
          {firstLine(data.source.content)}
        </p>
        <PostLink post={data.source} agentType='linkedin-posting'>
          Open the LinkedIn post
        </PostLink>
      </Shell>
    )
  }

  const { link, mirror } = data

  if (!link) {
    if (!data.canLink || !links) return null
    const suggestion = links.suggestions.find(
      (s) => s.linkedin._id === post.profileId
    )
    return (
      <Shell platform='twitter' title='Also post on X'>
        <p className='text-muted-foreground text-xs'>
          Link your X profile and this post gets an X version, written for X,
          for you to approve.
        </p>
        <Button
          size='sm'
          variant='outline'
          className='h-7'
          onClick={() =>
            setTarget({
              kind: 'new',
              linkedin: links.unlinked.linkedin,
              x: links.unlinked.x,
              preselect: {
                linkedinId: post.profileId,
                xId: suggestion?.x._id,
              },
            })
          }
        >
          Link X profile
        </Button>
        <LinkProfilesDialog
          target={target}
          onOpenChange={(open) => !open && setTarget(null)}
        />
      </Shell>
    )
  }

  if (!mirror) {
    return (
      <Shell platform='twitter' title={`Also post on X · ${link.x.handle}`}>
        {!link.x.postingActive ? (
          <p className='text-xs text-amber-600'>
            Turn on X posting for {link.x.handle} to get an X version.
          </p>
        ) : MIRRORABLE.has(post.status) ? (
          <>
            <p className='text-muted-foreground text-xs'>
              {link.mirror.linkedinToX === 'auto-draft'
                ? 'No X version yet.'
                : 'X versions are drafted when you ask.'}{' '}
              It goes out {link.mirror.offsetHours}h after this post, and you
              approve it first.
            </p>
            <Button
              size='sm'
              variant='outline'
              className='h-7'
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending && (
                <IconLoader2 className='mr-1 size-3.5 animate-spin' />
              )}
              Draft X version
            </Button>
          </>
        ) : (
          <p className='text-muted-foreground text-xs'>
            It gets an X version once it's written.
          </p>
        )}
      </Shell>
    )
  }

  const posts = splitThread(mirror.content)
  const isThread = mirror.outputType === 'thread' && posts.length > 1
  return (
    <Shell
      platform='twitter'
      title={`X version · ${link.x.handle}`}
      badge={STATUS_LABEL[mirror.status] ?? mirror.status}
    >
      {mirror.status === 'generating' ? (
        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          <IconLoader2 className='size-3.5 animate-spin' />
          Writing the X version. It takes about a minute.
        </p>
      ) : (
        <>
          <p className='line-clamp-4 text-xs whitespace-pre-line'>
            {posts[0] ?? mirror.content}
          </p>
          <p className='text-muted-foreground text-[11px]'>
            {isThread ? `Thread · ${posts.length} posts · ` : ''}
            {mirror.scheduledAt
              ? `${mirror.status === 'published' ? 'Went out' : 'Goes out'} ${format(new Date(mirror.scheduledAt), 'EEE d MMM, HH:mm')}`
              : ''}
          </p>
        </>
      )}
      <PostLink post={mirror} agentType='twitter-posting'>
        Open the X version
      </PostLink>
    </Shell>
  )
}

function Shell({
  platform,
  title,
  badge,
  children,
}: {
  platform: 'linkedin' | 'twitter'
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className='mt-4 space-y-2 rounded-lg border p-3'>
      <div className='flex items-center justify-between gap-2'>
        <p className='flex items-center gap-1.5 text-xs font-medium'>
          <PlatformIcon platform={platform} className='size-3.5' />
          {title}
        </p>
        {badge && (
          <Badge variant='secondary' className='text-[10px]'>
            {badge}
          </Badge>
        )}
      </div>
      {children}
    </div>
  )
}

function PostLink({
  post,
  agentType,
  children,
}: {
  post: MirrorPostSummary
  agentType: 'linkedin-posting' | 'twitter-posting'
  children: React.ReactNode
}) {
  return (
    <Link
      to={'/agents/$profileId/$agentType/post/$postId' as any}
      params={
        { profileId: post.profileId, agentType, postId: post._id } as any
      }
      search={{ calendarId: post.calendarId } as any}
      className='text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline'
    >
      {children}
      <IconArrowRight className='size-3' />
    </Link>
  )
}

function firstLine(text: string): string {
  return (
    (text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? ''
  )
}
