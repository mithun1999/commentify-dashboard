import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconArrowsLeftRight,
  IconBrandLinkedin,
  IconBrandX,
  IconBuilding,
  IconLoader2,
  IconUser,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MIRROR_OFFSET_HOURS,
  type LinkVoice,
  type LinkedProfileSummary,
  type ProfileLink,
  type ProfileLinks,
} from '../api/profile-links.api'
import {
  useLinkProfiles,
  useProfileLinks,
  useUpdateProfileLink,
} from '../query/profile-links.query'

type Network = 'linkedin' | 'twitter'

/**
 * A new link, optionally starting from a profile on either side (locked
 * when the caller is about that profile), or the settings of an existing
 * link.
 */
export type LinkDialogTarget =
  | {
      kind: 'new'
      linkedinId?: string
      xId?: string
      lock?: Network
    }
  | { kind: 'edit'; link: ProfileLink }

interface LinkProfilesDialogProps {
  target: LinkDialogTarget | null
  onOpenChange: (open: boolean) => void
}

const hoursLabel = (h: number) => (h === 1 ? '1 hour' : `${h} hours`)
const flat = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const sameName = (a?: LinkedProfileSummary, b?: LinkedProfileSummary) =>
  !!a && !!b && flat(a.name).length >= 3 && flat(a.name) === flat(b.name)
const label = (p: LinkedProfileSummary) =>
  p.platform === 'twitter' ? p.handle : p.name

/**
 * The one dialog for linking a LinkedIn profile with an X account, from
 * every entry point. One profile on each side: the backend takes many, the
 * dashboard keeps it one to one until someone needs more. LinkedIn and X
 * sit side by side, each direction its own switch, and the defaults are
 * worked out so most people only press Link.
 */
export function LinkProfilesDialog({
  target,
  onOpenChange,
}: LinkProfilesDialogProps) {
  const { data } = useProfileLinks(!!target)
  if (!target || !data) return null
  return (
    <LinkForm
      key={target.kind === 'edit' ? target.link._id : 'new'}
      target={target}
      data={data}
      onClose={() => onOpenChange(false)}
    />
  )
}

function LinkForm({
  target,
  data,
  onClose,
}: {
  target: LinkDialogTarget
  data: ProfileLinks
  onClose: () => void
}) {
  const linkMutation = useLinkProfiles()
  const updateMutation = useUpdateProfileLink()
  const editing = target.kind === 'edit' ? target.link : null

  // A profile already in a link is taken; the dashboard keeps links 1:1.
  const partnerOf = useMemo(() => {
    const map = new Map<string, LinkedProfileSummary>()
    for (const l of data.links) {
      if (l._id === editing?._id) continue
      map.set(l.linkedin._id, l.x)
      map.set(l.x._id, l.linkedin)
    }
    return map
  }, [data.links, editing?._id])
  const free = (list: LinkedProfileSummary[]) =>
    list.filter((p) => !partnerOf.has(p._id))
  const firstFree = (list: LinkedProfileSummary[]) =>
    free(list).length === 1 ? free(list)[0]._id : ''

  const [linkedinId, setLinkedinId] = useState(
    editing?.linkedin._id ??
      (target.kind === 'new' ? target.linkedinId : undefined) ??
      firstFree(data.profiles.linkedin)
  )
  const [xId, setXId] = useState(
    editing?.x._id ??
      (target.kind === 'new' ? target.xId : undefined) ??
      firstFree(data.profiles.x)
  )
  const [voice, setVoice] = useState<LinkVoice | null>(editing?.voice ?? null)
  const [showVoice, setShowVoice] = useState(false)
  const [toX, setToX] = useState(
    editing ? editing.mirror.linkedinToX === 'auto-draft' : true
  )
  const [toLinkedin, setToLinkedin] = useState(
    editing ? editing.mirror.xToLinkedin === 'auto-draft' : true
  )
  const [offsetHours, setOffsetHours] = useState(
    editing?.mirror.offsetHours ?? 2
  )

  const linkedin = data.profiles.linkedin.find((p) => p._id === linkedinId)
  const x = data.profiles.x.find((p) => p._id === xId)
  const pair = linkedin && x ? { linkedin, x } : null

  // Whose account the X one is, worked out as the backend does.
  const suggestedVoice: LinkVoice = !pair
    ? 'person'
    : sameName(pair.linkedin, pair.x)
      ? 'person'
      : (pair.x.speaksAs ?? 'person')
  const effectiveVoice: LinkVoice = voice ?? suggestedVoice

  const busy = linkMutation.isPending || updateMutation.isPending
  const canSave = !!pair && !busy

  const save = () => {
    if (!pair) return
    const settings = {
      voice: effectiveVoice,
      linkedinToX: toX ? ('auto-draft' as const) : ('suggest' as const),
      xToLinkedin: toLinkedin ? ('auto-draft' as const) : ('suggest' as const),
      offsetHours,
    }
    if (editing) {
      updateMutation.mutate(
        { linkId: editing._id, ...settings },
        { onSuccess: onClose }
      )
      return
    }
    linkMutation.mutate(
      {
        linkedinProfileIds: [pair.linkedin._id],
        xProfileIds: [pair.x._id],
        ...settings,
      },
      { onSuccess: onClose }
    )
  }

  const lock = editing ? 'both' : target.kind === 'new' ? target.lock : undefined

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Link settings' : 'Link profiles'}</DialogTitle>
          <DialogDescription>
            A post on one side gets a version on the other, written for that
            network, for you to approve.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <div className='grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]'>
            <ProfilePicker
              network='linkedin'
              profiles={data.profiles.linkedin}
              value={linkedinId}
              onChange={setLinkedinId}
              locked={lock === 'both' || lock === 'linkedin'}
              partnerOf={partnerOf}
            />
            <IconArrowsLeftRight className='text-muted-foreground mb-3 hidden size-4 sm:block' />
            <ProfilePicker
              network='twitter'
              profiles={data.profiles.x}
              value={xId}
              onChange={setXId}
              locked={lock === 'both' || lock === 'twitter'}
              partnerOf={partnerOf}
            />
          </div>

          {pair && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
                <p className='flex items-center gap-2 text-sm'>
                  {effectiveVoice === 'person' ? (
                    <IconUser className='text-muted-foreground size-4 shrink-0' />
                  ) : (
                    <IconBuilding className='text-muted-foreground size-4 shrink-0' />
                  )}
                  {effectiveVoice === 'person'
                    ? `${pair.linkedin.name} and ${pair.x.handle} are the same person`
                    : `${pair.x.handle} is a company account; ${pair.linkedin.name} posts as themselves`}
                </p>
                <button
                  type='button'
                  className='text-primary shrink-0 text-xs font-medium hover:underline'
                  onClick={() => setShowVoice((v) => !v)}
                >
                  {showVoice ? 'Done' : 'Change'}
                </button>
              </div>
              {showVoice && (
                <div className='grid gap-2 sm:grid-cols-2'>
                  <VoiceOption
                    selected={effectiveVoice === 'person'}
                    icon={<IconUser className='size-4' />}
                    title='The same person'
                    hint={`Both sides written as ${pair.linkedin.name}: "I…"`}
                    onClick={() => setVoice('person')}
                  />
                  <VoiceOption
                    selected={effectiveVoice === 'team'}
                    icon={<IconBuilding className='size-4' />}
                    title={`${pair.x.handle} is a company account`}
                    hint={`On X written as the company ("we…"); on LinkedIn as ${pair.linkedin.name}, about it.`}
                    onClick={() => setVoice('team')}
                  />
                </div>
              )}
            </div>
          )}

          <div className='space-y-3 rounded-lg border p-3'>
            <Direction
              id='to-x'
              checked={toX}
              onChange={setToX}
              from='linkedin'
              title='LinkedIn posts get an X version'
              hint='Every LinkedIn post written from now on, for you to approve.'
              blocked={
                toX && x && !x.postingActive
                  ? {
                      text: `X versions need X posting on ${x.handle}.`,
                      agent: 'twitter-posting',
                    }
                  : undefined
              }
            />
            <Direction
              id='to-linkedin'
              checked={toLinkedin}
              onChange={setToLinkedin}
              from='twitter'
              title='X posts get a LinkedIn version'
              hint='Every X post written from now on, expanded for LinkedIn. At most one LinkedIn post a day, and never more than half your LinkedIn week.'
              blocked={
                toLinkedin && linkedin && !linkedin.postingActive
                  ? {
                      text: `LinkedIn versions need LinkedIn posting for ${linkedin.name}.`,
                      agent: 'linkedin-posting',
                    }
                  : undefined
              }
            />
            {!toX && !toLinkedin && (
              <p className='text-muted-foreground text-xs'>
                Both off: versions are drafted only when you ask, from a post.
              </p>
            )}

            <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-3'>
              <Label className='text-sm font-normal'>Post the version</Label>
              <div className='flex items-center gap-2'>
                <Select
                  value={String(offsetHours)}
                  onValueChange={(v) => setOffsetHours(Number(v))}
                >
                  <SelectTrigger className='h-8 w-[110px] text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MIRROR_OFFSET_HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)} className='text-xs'>
                        {hoursLabel(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className='text-muted-foreground text-xs'>
                  after the original
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2'>
          <Button variant='outline' disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save}>
            {busy && <IconLoader2 className='mr-1 size-4 animate-spin' />}
            {editing ? 'Save' : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** One side: the profile, or a dropdown with the taken ones greyed out. */
function ProfilePicker({
  network,
  profiles,
  value,
  onChange,
  locked,
  partnerOf,
}: {
  network: Network
  profiles: LinkedProfileSummary[]
  value: string
  onChange: (id: string) => void
  locked: boolean
  partnerOf: Map<string, LinkedProfileSummary>
}) {
  const title = network === 'twitter' ? 'X' : 'LinkedIn'
  const current = profiles.find((p) => p._id === value)
  return (
    <div className='min-w-0 space-y-2'>
      <p className='flex items-center gap-1.5 text-sm font-medium'>
        <PlatformIcon platform={network} />
        {title}
      </p>
      {locked || profiles.length <= 1 ? (
        current ? (
          <ProfileRow profile={current} />
        ) : (
          <p className='text-muted-foreground text-sm'>
            Connect a {title} profile first.
          </p>
        )
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Choose ${title}`} />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => {
              const partner = partnerOf.get(p._id)
              return (
                <SelectItem key={p._id} value={p._id} disabled={!!partner}>
                  {label(p)}
                  {partner ? ` · linked to ${label(partner)}` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function Direction({
  id,
  checked,
  onChange,
  from,
  title,
  hint,
  blocked,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  from: Network
  title: string
  hint: string
  blocked?: { text: string; agent: string }
}) {
  return (
    <div className='flex items-start gap-3'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className='mt-0.5'
      />
      <div className='space-y-1'>
        <Label htmlFor={id} className='flex items-center gap-1.5 text-sm font-medium'>
          <PlatformIcon platform={from} className='size-3.5' />
          {title}
        </Label>
        <p className='text-muted-foreground text-xs'>{hint}</p>
        {blocked && (
          <p className='text-xs text-amber-600'>
            {blocked.text}{' '}
            <Link
              to='/'
              search={{ addAgent: blocked.agent } as any}
              className='font-medium underline'
            >
              Set it up
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function VoiceOption({
  selected,
  icon,
  title,
  hint,
  onClick,
}: {
  selected: boolean
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'space-y-1 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      )}
    >
      <span className='flex items-center gap-1.5 text-sm font-medium'>
        {icon}
        {title}
      </span>
      <span className='text-muted-foreground block text-xs'>{hint}</span>
    </button>
  )
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Network
  className?: string
}) {
  return platform === 'twitter' ? (
    <IconBrandX className={className ?? 'size-4'} />
  ) : (
    <IconBrandLinkedin className={cn('text-[#0A66C2]', className ?? 'size-4')} />
  )
}

export function ProfileRow({ profile }: { profile: LinkedProfileSummary }) {
  return (
    <div className='flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2'>
      <PlatformIcon platform={profile.platform} />
      <div className='min-w-0'>
        <p className='truncate text-sm font-medium'>{label(profile)}</p>
        <p className='text-muted-foreground truncate text-xs'>
          {profile.platform === 'twitter' ? profile.name : profile.handle}
        </p>
      </div>
    </div>
  )
}
