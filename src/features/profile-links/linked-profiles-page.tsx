import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconArrowsLeftRight,
  IconLink,
  IconLoader2,
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
import { Button } from '@/components/ui/button'
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

/**
 * Linked profiles: every LinkedIn + X pair that is the same person, how its
 * X versions are drafted, and linking or unlinking by hand. The hub banner
 * only suggests; this is where linking always works, including a pair the
 * author once said was not them.
 */
export default function LinkedProfilesPage() {
  const { data, isLoading } = useProfileLinks()
  const unlink = useUnlinkProfiles()
  const [target, setTarget] = useState<LinkDialogTarget | null>(null)
  const [unlinking, setUnlinking] = useState<ProfileLink | null>(null)

  const canLink =
    !!data && data.unlinked.linkedin.length > 0 && data.unlinked.x.length > 0
  const openNew = () =>
    data &&
    setTarget({
      kind: 'new',
      linkedin: data.unlinked.linkedin,
      x: data.unlinked.x,
    })

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
                Link a LinkedIn and an X profile that belong to the same
                person. Their LinkedIn posts can then get an X version,
                written for X, for you to approve.
              </p>
            </div>
            <Button onClick={openNew} disabled={!canLink}>
              <IconLink className='mr-1 size-4' />
              Link profiles
            </Button>
          </div>

          {isLoading || !data ? (
            <div className='space-y-3'>
              <Skeleton className='h-20 w-full' />
              <Skeleton className='h-20 w-full' />
            </div>
          ) : (
            <div className='space-y-8'>
              <section className='space-y-3'>
                <h2 className='text-sm font-semibold'>Linked</h2>
                {data.links.length === 0 ? (
                  <p className='text-muted-foreground rounded-lg border border-dashed p-4 text-sm'>
                    Nothing linked yet.
                    {canLink
                      ? ' Use Link profiles to pair a LinkedIn and an X profile.'
                      : ' Connect a LinkedIn and an X profile to link them.'}
                  </p>
                ) : (
                  data.links.map((link) => (
                    <div
                      key={link._id}
                      className='bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4'
                    >
                      <div className='min-w-0 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <ProfileChip profile={link.linkedin} />
                          <IconArrowsLeftRight className='text-muted-foreground size-4' />
                          <ProfileChip profile={link.x} />
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {link.mirror.linkedinToX === 'auto-draft'
                            ? `Every LinkedIn post gets an X version, ${link.mirror.offsetHours}h after it.`
                            : `X versions only when you ask, ${link.mirror.offsetHours}h after the LinkedIn post.`}
                          {!link.x.postingActive &&
                            ` X posting is off for ${link.x.handle}, so none are drafted.`}
                        </p>
                      </div>
                      <div className='flex shrink-0 gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setTarget({ kind: 'edit', link })}
                        >
                          <IconSettings className='mr-1 size-3.5' />
                          Settings
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-red-600 hover:text-red-600'
                          onClick={() => setUnlinking(link)}
                        >
                          Unlink
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {(data.unlinked.linkedin.length > 0 ||
                data.unlinked.x.length > 0) && (
                <section className='space-y-3'>
                  <h2 className='text-sm font-semibold'>Not linked</h2>
                  <div className='flex flex-wrap gap-2'>
                    {[...data.unlinked.linkedin, ...data.unlinked.x].map(
                      (p) => (
                        <ProfileChip key={p._id} profile={p} />
                      )
                    )}
                  </div>
                  {!canLink && (
                    <p className='text-muted-foreground text-xs'>
                      Linking needs one LinkedIn and one X profile.{' '}
                      <Link to='/' className='text-primary hover:underline'>
                        Add an agent
                      </Link>{' '}
                      for the other platform first.
                    </p>
                  )}
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
              Their LinkedIn posts stop getting X versions. X versions already
              drafted stay on the X calendar as ordinary X posts. You can link
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
    <span className='bg-muted/50 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm'>
      <PlatformIcon platform={profile.platform} className={profile.platform === 'twitter' ? 'size-3.5' : 'size-3.5 text-[#0A66C2]'} />
      <span className='font-medium'>
        {profile.platform === 'twitter' ? profile.handle : profile.name}
      </span>
      {profile.platform !== 'twitter' && profile.handle && (
        <span className='text-muted-foreground text-xs'>{profile.handle}</span>
      )}
    </span>
  )
}
