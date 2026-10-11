import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconBrandX,
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

/**
 * Linked profiles, one card per X account with the LinkedIn profiles that
 * feed it. The same page serves a solo founder (one card, one row), a
 * company (one account, several people) and an agency (many accounts, with
 * search). This is where linking always works, including a pair once
 * dismissed on the hub.
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
    return data.profiles.x
      .map((x) => ({
        x,
        links: data.links.filter((l) => l.x._id === x._id),
      }))
      .filter(
        ({ x, links }) =>
          !q ||
          flat(`${x.name} ${x.handle}`).includes(q) ||
          links.some((l) => flat(`${l.linkedin.name} ${l.linkedin.handle}`).includes(q))
      )
      .sort((a, b) => Number(b.links.length > 0) - Number(a.links.length > 0))
  }, [data, search])

  const hasBoth =
    !!data && data.profiles.linkedin.length > 0 && data.profiles.x.length > 0
  const manyAccounts =
    !!data && data.profiles.x.length + data.profiles.linkedin.length > 8

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
                Choose which LinkedIn profiles feed each X account. Their
                LinkedIn posts get an X version there, written for X, for you
                to approve.
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
              {manyAccounts && (
                <div className='relative'>
                  <IconSearch className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search accounts and people'
                    className='pl-9'
                  />
                </div>
              )}

              {groups.map(({ x, links }) => (
                <XAccountCard
                  key={x._id}
                  x={x}
                  links={links}
                  onAdd={() =>
                    setTarget({ kind: 'new', xId: x._id, lockX: true })
                  }
                  onEdit={(link) => setTarget({ kind: 'edit', link })}
                  onUnlink={setUnlinking}
                />
              ))}
              {groups.length === 0 && (
                <p className='text-muted-foreground text-sm'>
                  Nothing matches "{search}".
                </p>
              )}

              {data.unlinked.linkedin.length > 0 && !search && (
                <section className='space-y-2 pt-2'>
                  <h2 className='text-sm font-semibold'>
                    LinkedIn profiles not feeding any X account
                  </h2>
                  <div className='flex flex-wrap gap-2'>
                    {data.unlinked.linkedin.map((p) => (
                      <button
                        key={p._id}
                        type='button'
                        onClick={() =>
                          setTarget({
                            kind: 'new',
                            linkedinIds: [p._id],
                            lockLinkedin: true,
                          })
                        }
                        className='bg-muted/50 hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm'
                      >
                        <PlatformIcon platform='linkedin' className='size-3.5' />
                        <span className='font-medium'>{p.name}</span>
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
              Stop sharing {unlinking?.linkedin.name}'s posts on{' '}
              {unlinking?.x.handle}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              New LinkedIn posts from {unlinking?.linkedin.name} won't get an
              X version on {unlinking?.x.handle}. X versions already drafted
              stay there as ordinary X posts. You can link them again any
              time.
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

function XAccountCard({
  x,
  links,
  onAdd,
  onEdit,
  onUnlink,
}: {
  x: LinkedProfileSummary
  links: ProfileLink[]
  onAdd: () => void
  onEdit: (link: ProfileLink) => void
  onUnlink: (link: ProfileLink) => void
}) {
  const own = links.find((l) => l.voice === 'person')
  return (
    <div className='bg-card rounded-lg border'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconBrandX className='size-4 shrink-0' />
          <span className='font-semibold'>{x.handle}</span>
          {x.name && x.name !== x.handle.slice(1) && (
            <span className='text-muted-foreground truncate text-sm'>
              {x.name}
            </span>
          )}
          {links.length > 0 && (
            <Badge variant='secondary' className='text-[10px]'>
              {own ? `${own.linkedin.name}'s own account` : 'Company account'}
            </Badge>
          )}
          {!x.postingActive && (
            <Badge variant='outline' className='text-[10px] text-amber-600'>
              X posting off
            </Badge>
          )}
        </div>
        <Button variant='outline' size='sm' className='h-7' onClick={onAdd}>
          <IconPlus className='mr-1 size-3.5' />
          Add LinkedIn profile
        </Button>
      </div>

      {links.length === 0 ? (
        <p className='text-muted-foreground px-4 py-3 text-sm'>
          No LinkedIn profiles feed {x.handle} yet.
        </p>
      ) : (
        <div className='divide-y'>
          {links.map((link) => (
            <div
              key={link._id}
              className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5'
            >
              <div className='min-w-0 space-y-0.5'>
                <div className='flex items-center gap-2 text-sm'>
                  <PlatformIcon platform='linkedin' className='size-3.5' />
                  <span className='font-medium'>{link.linkedin.name}</span>
                  <span className='text-muted-foreground text-xs'>
                    {link.voice === 'person'
                      ? 'written as them'
                      : 'written as the company'}
                  </span>
                </div>
                <p className='text-muted-foreground text-xs'>
                  {link.mirror.linkedinToX === 'auto-draft'
                    ? `Automatic · ${link.mirror.offsetHours}h after the LinkedIn post`
                    : `When you ask · ${link.mirror.offsetHours}h after the LinkedIn post`}
                </p>
              </div>
              <div className='flex shrink-0 gap-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7'
                  onClick={() => onEdit(link)}
                >
                  <IconSettings className='mr-1 size-3.5' />
                  Settings
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-red-600 hover:text-red-600'
                  onClick={() => onUnlink(link)}
                >
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
