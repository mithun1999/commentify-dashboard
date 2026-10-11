import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { IconArrowRight, IconLoader2, IconPlus } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { splitThread } from '@/features/post-generator/utils/x-text'
import type {
  MirrorPostSummary,
  ProfileLink,
} from '../api/profile-links.api'
import {
  useCreatePostMirror,
  usePostMirror,
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
 * Post editor. On a LinkedIn post: each X account it feeds, with that
 * account's X version or a button to draft one, and a way to share it on
 * another account. On an X version: whose LinkedIn post it came from.
 */
export function XVersionCard({
  post,
}: {
  post: { _id: string; status: string; platform?: string; profileId?: string }
}) {
  const { data } = usePostMirror(post._id)
  const create = useCreatePostMirror(post._id)
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)
  const [drafting, setDrafting] = useState<string | null>(null)

  if (!data || data.role === 'none') return null

  if (data.role === 'mirror') {
    if (!data.source) return null
    const who = data.author?.name ?? 'the author'
    return (
      <Shell title={`From ${who}'s LinkedIn post`} platform='linkedin'>
        <p className='text-muted-foreground line-clamp-2 text-xs'>
          {firstLine(data.source.content)}
        </p>
        {data.voice === 'team' && (
          <p className='text-muted-foreground text-[11px]'>
            Written as this account, not as {who}.
          </p>
        )}
        <PostLink post={data.source} agentType='linkedin-posting'>
          Open the LinkedIn post
        </PostLink>
      </Shell>
    )
  }

  const openLink = () =>
    setTarget({
      kind: 'new',
      linkedinIds: post.profileId ? [post.profileId] : [],
      lockLinkedin: true,
    })
  const dialog = (
    <LinkProfilesDialog
      target={target}
      onOpenChange={(open) => !open && setTarget(null)}
    />
  )

  if (data.targets.length === 0) {
    if (!data.canLinkMore) return null
    return (
      <Shell title='Also post on X' platform='twitter'>
        <p className='text-muted-foreground text-xs'>
          Link an X account and this post gets an X version, written for X,
          for you to approve.
        </p>
        <Button size='sm' variant='outline' className='h-7' onClick={openLink}>
          Link an X account
        </Button>
        {dialog}
      </Shell>
    )
  }

  return (
    <Shell title='On X' platform='twitter'>
      <div className='divide-y'>
        {data.targets.map(({ link, mirror }) => (
          <TargetRow
            key={link._id}
            link={link}
            mirror={mirror}
            canDraft={MIRRORABLE.has(post.status)}
            drafting={create.isPending && drafting === link.x._id}
            onDraft={() => {
              setDrafting(link.x._id)
              create.mutate(link.x._id)
            }}
          />
        ))}
      </div>
      {data.canLinkMore && (
        <button
          type='button'
          onClick={openLink}
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
        >
          <IconPlus className='size-3' />
          Share on another X account
        </button>
      )}
      {dialog}
    </Shell>
  )
}

function TargetRow({
  link,
  mirror,
  canDraft,
  drafting,
  onDraft,
}: {
  link: ProfileLink
  mirror: MirrorPostSummary | null
  canDraft: boolean
  drafting: boolean
  onDraft: () => void
}) {
  const heading = (
    <div className='flex items-center justify-between gap-2'>
      <p className='text-xs font-medium'>
        {link.x.handle}
        <span className='text-muted-foreground ml-1.5 font-normal'>
          {link.voice === 'person' ? 'own account' : 'company account'}
        </span>
      </p>
      {mirror && (
        <Badge variant='secondary' className='text-[10px]'>
          {STATUS_LABEL[mirror.status] ?? mirror.status}
        </Badge>
      )}
    </div>
  )

  if (!mirror) {
    return (
      <div className='space-y-1.5 py-2 first:pt-0 last:pb-0'>
        {heading}
        {!link.x.postingActive ? (
          <p className='text-xs text-amber-600'>
            Turn on X posting for {link.x.handle} to get an X version.
          </p>
        ) : canDraft ? (
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-7'
              disabled={drafting}
              onClick={onDraft}
            >
              {drafting && <IconLoader2 className='mr-1 size-3.5 animate-spin' />}
              Draft X version
            </Button>
            <span className='text-muted-foreground text-[11px]'>
              {link.mirror.linkedinToX === 'auto-draft'
                ? 'Only posts written after linking get one on their own. '
                : ''}
              Goes out {link.mirror.offsetHours}h after this post, once you
              approve it.
            </span>
          </div>
        ) : (
          <p className='text-muted-foreground text-xs'>
            It gets an X version once it's written.
          </p>
        )}
      </div>
    )
  }

  const posts = splitThread(mirror.content)
  const isThread = mirror.outputType === 'thread' && posts.length > 1
  return (
    <div className='space-y-1.5 py-2 first:pt-0 last:pb-0'>
      {heading}
      {mirror.status === 'generating' ? (
        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          <IconLoader2 className='size-3.5 animate-spin' />
          Writing it. Takes about a minute.
        </p>
      ) : (
        <>
          <p className='line-clamp-3 text-xs whitespace-pre-line'>
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
        Open
      </PostLink>
    </div>
  )
}

function Shell({
  title,
  platform,
  children,
}: {
  title: string
  platform: 'linkedin' | 'twitter'
  children: React.ReactNode
}) {
  return (
    <div className='mt-4 space-y-2 rounded-lg border p-3'>
      <p className='flex items-center gap-1.5 text-xs font-semibold'>
        <PlatformIcon platform={platform} className='size-3.5' />
        {title}
      </p>
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
