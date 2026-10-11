import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconArrowsLeftRight,
  IconLink,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import type {
  LinkedProfileSummary,
  MirrorSettings,
  ProfileLink,
} from './api/profile-links.api'
import {
  useProfileLinks,
  useUnlinkProfiles,
} from './query/profile-links.query'
import {
  LinkProfilesDialog,
  PlatformIcon,
  type LinkDialogTarget,
} from './components/link-profiles-dialog'

const flat = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const label = (p: LinkedProfileSummary) =>
  p.platform === 'twitter' ? p.handle : p.name

/**
 * Profiles that share links, so related pairs sit together: a solo founder's
 * two accounts, a company's people and its X account, an agency's clients.
 */
function groupLinks(links: ProfileLink[]): ProfileLink[][] {
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    const p = parent.get(id) ?? id
    if (p === id) return id
    const root = find(p)
    parent.set(id, root)
    return root
  }
  for (const l of links) {
    parent.set(find(l.linkedin._id), find(l.x._id))
  }
  const groups = new Map<string, ProfileLink[]>()
  for (const l of links) {
    const root = find(l.linkedin._id)
    groups.set(root, [...(groups.get(root) ?? []), l])
  }
  return [...groups.values()]
}

function directionSummary(mirror: MirrorSettings): string {
  const toX = mirror.linkedinToX === 'auto-draft'
  const toLinkedin = mirror.xToLinkedin === 'auto-draft'
  const when = `${mirror.offsetHours}h after the original`
  if (toX && toLinkedin) return `Both ways, automatically · ${when}`
  if (toX) return `LinkedIn → X automatically, X → LinkedIn when you ask · ${when}`
  if (toLinkedin) return `X → LinkedIn automatically, LinkedIn → X when you ask · ${when}`
  return `Both ways, when you ask · ${when}`
}

/**
 * Linked profiles: every LinkedIn and X pair whose posts are shared, with
 * both sides shown the same way. Serves a solo founder (one pair), a
 * company (several people and one X account) and an agency (many groups,
 * with search). Linking always works here, including a pair once dismissed.
 */
export default function LinkedProfilesPage() {
  const { data, isLoading } = useProfileLinks()
  const unlink = useUnlinkProfiles()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)
  const [unlinking, setUnlinking] = useState<ProfileLink | null>(null)
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    if (!data) return []
    const q = flat(search)
    return groupLinks(data.links).filter(
      (group) =>
        !q ||
        group.some((l) =>
          flat(`${l.linkedin.name} ${l.linkedin.handle} ${l.x.name} ${l.x.handle}`).includes(q)
        )
    )
  }, [data, search])

  const unlinked = useMemo(() => {
    if (!data) return []
    return [...data.unlinked.linkedin, ...data.unlinked.x].sort((a, b) =>
      label(a).localeCompare(label(b))
    )
  }, [data])

  const hasBoth =
    !!data && data.profiles.linkedin.length > 0 && data.profiles.x.length > 0
  const many =
    !!data && data.profiles.linkedin.length + data.profiles.x.length > 8

  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mx-auto max-w-3xl'>
          <div className='mb-6 flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>
                Linked profiles
              </h1>
              <p className='text-muted-foreground max-w-xl text-sm'>
                Link LinkedIn profiles and X accounts to share posts between
                them. A post on one side gets a version on the other, written
                for that network, for you to approve.
              </p>
            </div>
            <Button
              onClick={() => setTarget({ kind: 'new' })}
              disabled={!hasBoth}
            >
              <IconLink className='mr-1 size-4' />
              Link profiles
            </Button>
          </div>

          {isLoading || !data ? (
            <div className='space-y-3'>
              <Skeleton className='h-28 w-full' />
              <Skeleton className='h-28 w-full' />
            </div>
          ) : !hasBoth ? (
            <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-sm'>
              Linking needs a LinkedIn profile and an X account.{' '}
              <Link to='/' className='text-primary hover:underline'>
                Add an agent
              </Link>{' '}
              for the one you're missing.
            </div>
          ) : (
            <div className='space-y-4'>
              {many && (
                <div className='relative'>
                  <IconSearch className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search people and accounts'
                    className='pl-9'
                  />
                </div>
              )}

              {data.links.length === 0 && (
                <p className='text-muted-foreground rounded-lg border border-dashed p-4 text-sm'>
                  Nothing linked yet. Use Link profiles, or pick a profile
                  below.
                </p>
              )}

              {groups.map((group) => (
                <div key={group[0]._id} className='bg-card divide-y rounded-lg border'>
                  {group.map((link) => (
                    <div
                      key={link._id}
                      className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'
                    >
                      <div className='min-w-0 space-y-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <ProfileChip profile={link.linkedin} />
                          <IconArrowsLeftRight className='text-muted-foreground size-4' />
                          <ProfileChip profile={link.x} />
                          <Badge variant='secondary' className='text-[10px]'>
                            {link.voice === 'person'
                              ? 'Same person'
                              : 'Company account'}
                          </Badge>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {directionSummary(link.mirror)}
                        </p>
                      </div>
                      <div className='flex shrink-0 gap-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7'
                          onClick={() => setTarget({ kind: 'edit', link })}
                        >
                          <IconSettings className='mr-1 size-3.5' />
                          Settings
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 text-red-600 hover:text-red-600'
                          onClick={() => setUnlinking(link)}
                        >
                          Unlink
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {groups.length === 0 && data.links.length > 0 && (
                <p className='text-muted-foreground text-sm'>
                  Nothing matches "{search}".
                </p>
              )}

              {unlinked.length > 0 && !search && (
                <section className='space-y-2 pt-2'>
                  <h2 className='text-sm font-semibold'>Not linked yet</h2>
                  <div className='flex flex-wrap gap-2'>
                    {unlinked.map((p) => (
                      <button
                        key={p._id}
                        type='button'
                        onClick={() =>
                          setTarget(
                            p.platform === 'twitter'
                              ? { kind: 'new', xIds: [p._id], lock: 'twitter' }
                              : { kind: 'new', linkedinIds: [p._id], lock: 'linkedin' }
                          )
                        }
                        className='bg-muted/50 hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm'
                      >
                        <PlatformIcon platform={p.platform} className='size-3.5' />
                        <span className='font-medium'>{label(p)}</span>
                        <IconPlus className='text-muted-foreground size-3.5' />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </Main>

      <LinkProfilesDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
      />

      <AlertDialog
        open={!!unlinking}
        onOpenChange={(open) => !open && !unlink.isPending && setUnlinking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader className='text-left'>
            <AlertDialogTitle>
              Unlink {unlinking?.linkedin.name} and {unlinking?.x.handle}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              New posts on either side stop getting a version on the other.
              Versions already drafted stay as ordinary posts. You can link
              them again any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlink.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant='destructive'
              disabled={unlink.isPending}
              onClick={() =>
                unlinking &&
                unlink.mutate(unlinking._id, {
                  onSuccess: () => setUnlinking(null),
                })
              }
            >
              {unlink.isPending && (
                <IconLoader2 className='mr-1 size-4 animate-spin' />
              )}
              Unlink
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ProfileChip({ profile }: { profile: LinkedProfileSummary }) {
  return (
    <span className='inline-flex items-center gap-1.5 text-sm'>
      <PlatformIcon platform={profile.platform} className='size-3.5' />
      <span className='font-medium'>{label(profile)}</span>
      {!profile.postingActive && (
        <span className='text-xs text-amber-600'>(posting off)</span>
      )}
    </span>
  )
}
