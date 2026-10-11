import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { IconArrowRight, IconLoader2, IconPlus } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { splitThread } from '@/features/post-generator/utils/x-text'
import type {
  LinkedProfileSummary,
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

type Network = 'linkedin' | 'twitter'

const STATUS_LABEL: Record<string, string> = {
  generating: 'Writing',
  ready: 'Ready for review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  needs_attention: 'Needs attention',
}

/** Where a post's status lets it have a version on the other network. */
const MIRRORABLE = new Set(['ready', 'approved', 'scheduled'])

const NAME: Record<Network, string> = { linkedin: 'LinkedIn', twitter: 'X' }
const AGENT: Record<Network, string> = {
  linkedin: 'linkedin-posting',
  twitter: 'twitter-posting',
}
const label = (p: LinkedProfileSummary) =>
  p.platform === 'twitter' ? p.handle : p.name

/**
 * Post editor, the same on either network. On an original post: each
 * linked profile on the other network, with its version or a button to draft
 * one, and a way to share it with another profile. On a version: whose post
 * it came from.
 */
export function CrossPostCard({
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
    const from = data.source.platform
    const who = data.from ? label(data.from) : 'the author'
    return (
      <Shell platform={from} title={`From ${who}'s ${NAME[from]} post`}>
        <p className='text-muted-foreground line-clamp-2 text-xs'>
          {firstLine(data.source.content)}
        </p>
        <PostLink post={data.source}>Open the {NAME[from]} post</PostLink>
      </Shell>
    )
  }

  const network = data.platform
  const other: Network = network === 'twitter' ? 'linkedin' : 'twitter'
  const openLink = () =>
    setTarget(
      network === 'twitter'
        ? { kind: 'new', xIds: post.profileId ? [post.profileId] : [], lock: 'twitter' }
        : { kind: 'new', linkedinIds: post.profileId ? [post.profileId] : [], lock: 'linkedin' }
    )
  const dialog = (
    <LinkProfilesDialog
      target={target}
      onOpenChange={(open) => !open && setTarget(null)}
    />
  )

  if (data.targets.length === 0) {
    if (!data.canLinkMore) return null
    return (
      <Shell platform={other} title={`Also post on ${NAME[other]}`}>
        <p className='text-muted-foreground text-xs'>
          Link a {NAME[other]} profile and this post gets a version there,
          written for {NAME[other]}, for you to approve.
        </p>
        <Button size='sm' variant='outline' className='h-7' onClick={openLink}>
          Link a {NAME[other]} profile
        </Button>
        {dialog}
      </Shell>
    )
  }

  return (
    <Shell platform={other} title={`On ${NAME[other]}`}>
      <div className='divide-y'>
        {data.targets.map(({ link, mirror }) => {
          const profile = other === 'twitter' ? link.x : link.linkedin
          return (
            <TargetRow
              key={link._id}
              other={other}
              profile={profile}
              link={link}
              mirror={mirror}
              canDraft={MIRRORABLE.has(post.status)}
              drafting={create.isPending && drafting === profile._id}
              onDraft={() => {
                setDrafting(profile._id)
                create.mutate(profile._id)
              }}
            />
          )
        })}
      </div>
      {data.canLinkMore && (
        <button
          type='button'
          onClick={openLink}
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
        >
          <IconPlus className='size-3' />
          Share with another {NAME[other]} profile
        </button>
      )}
      {dialog}
    </Shell>
  )
}

function TargetRow({
  other,
  profile,
  link,
  mirror,
  canDraft,
  drafting,
  onDraft,
}: {
  other: Network
  profile: LinkedProfileSummary
  link: ProfileLink
  mirror: MirrorPostSummary | null
  canDraft: boolean
  drafting: boolean
  onDraft: () => void
}) {
  const automatic =
    other === 'twitter'
      ? link.mirror.linkedinToX === 'auto-draft'
      : link.mirror.xToLinkedin === 'auto-draft'
  const heading = (
    <div className='flex items-center justify-between gap-2'>
      <p className='text-xs font-medium'>
        {label(profile)}
        <span className='text-muted-foreground ml-1.5 font-normal'>
          {link.voice === 'person' ? 'same person' : 'company account'}
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
        {!profile.postingActive ? (
          <p className='text-xs text-amber-600'>
            {NAME[other]} versions need {NAME[other]} posting for {label(profile)}.{' '}
            <Link
              to='/'
              search={{ addAgent: AGENT[other] } as any}
              className='font-medium underline'
            >
              Set it up
            </Link>
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
              Draft {NAME[other]} version
            </Button>
            <span className='text-muted-foreground text-[11px]'>
              {automatic ? 'Only posts written after linking get one on their own. ' : ''}
              Goes out {link.mirror.offsetHours}h after this post, once you
              approve it.
            </span>
          </div>
        ) : (
          <p className='text-muted-foreground text-xs'>
            It gets a version once it's written.
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
      <PostLink post={mirror}>Open</PostLink>
    </div>
  )
}

function Shell({
  title,
  platform,
  children,
}: {
  title: string
  platform: Network
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
  children,
}: {
  post: MirrorPostSummary
  children: React.ReactNode
}) {
  return (
    <Link
      to={'/agents/$profileId/$agentType/post/$postId' as any}
      params={
        {
          profileId: post.profileId,
          agentType: AGENT[post.platform],
          postId: post._id,
        } as any
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
