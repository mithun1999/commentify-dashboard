import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  IconBrandLinkedin,
  IconBrandX,
  IconBuilding,
  IconLoader2,
  IconSearch,
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
import { Input } from '@/components/ui/input'
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
 * A new link, optionally starting from profiles on either side (one side
 * locked when the caller is about one profile), or the settings of an
 * existing link.
 */
export type LinkDialogTarget =
  | {
      kind: 'new'
      linkedinIds?: string[]
      xIds?: string[]
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
 * The one dialog for linking LinkedIn profiles and X accounts, from every
 * entry point. LinkedIn and X sit side by side and each direction is its own
 * switch: neither network leads. Defaults are worked out so most people only
 * press Link.
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
  const only = <T,>(list: T[]) => (list.length === 1 ? list : [])

  const [linkedinSel, setLinkedinSel] = useState<string[]>(
    editing
      ? [editing.linkedin._id]
      : target.kind === 'new' && target.linkedinIds?.length
        ? target.linkedinIds
        : only(data.profiles.linkedin).map((p) => p._id)
  )
  const [xSel, setXSel] = useState<string[]>(
    editing
      ? [editing.x._id]
      : target.kind === 'new' && target.xIds?.length
        ? target.xIds
        : only(data.profiles.x).map((p) => p._id)
  )
  const [voice, setVoice] = useState<LinkVoice | null>(editing?.voice ?? null)
  const [showVoice, setShowVoice] = useState(false)
  const [toX, setToX] = useState<boolean | null>(
    editing ? editing.mirror.linkedinToX === 'auto-draft' : null
  )
  const [toLinkedin, setToLinkedin] = useState<boolean | null>(
    editing ? editing.mirror.xToLinkedin === 'auto-draft' : null
  )
  const [offsetHours, setOffsetHours] = useState(
    editing?.mirror.offsetHours ?? 2
  )

  const byId = useMemo(
    () =>
      new Map(
        [...data.profiles.linkedin, ...data.profiles.x].map((p) => [p._id, p])
      ),
    [data.profiles]
  )
  const chosenLinkedin = linkedinSel
    .map((id) => byId.get(id))
    .filter(Boolean) as LinkedProfileSummary[]
  const chosenX = xSel
    .map((id) => byId.get(id))
    .filter(Boolean) as LinkedProfileSummary[]
  const others = data.links.filter((l) => l._id !== editing?._id)
  const linked = (li: string, x: string) =>
    others.some((l) => l.linkedin._id === li && l.x._id === x)

  const pairs = editing
    ? [{ linkedin: editing.linkedin, x: editing.x }]
    : chosenLinkedin.flatMap((li) =>
        chosenX
          .filter((x) => !linked(li._id, x._id))
          .map((x) => ({ linkedin: li, x }))
      )
  const single = pairs.length === 1 ? pairs[0] : undefined

  // Whose account the X one is, worked out as the backend does.
  const ownerOfX = (xId: string) =>
    others.find((l) => l.x._id === xId && l.voice === 'person')
  const ownXOf = (liId: string) =>
    others.find((l) => l.linkedin._id === liId && l.voice === 'person')
  const personBlock = single
    ? ownerOfX(single.x._id) && ownerOfX(single.x._id)!.linkedin._id !== single.linkedin._id
      ? `${single.x.handle} is already ${ownerOfX(single.x._id)!.linkedin.name}'s own account.`
      : ownXOf(single.linkedin._id) && ownXOf(single.linkedin._id)!.x._id !== single.x._id
        ? `${single.linkedin.name}'s own X account is ${ownXOf(single.linkedin._id)!.x.handle}.`
        : null
    : null
  const personAllowed = !!single && !personBlock
  const suggestedVoice: LinkVoice = !personAllowed
    ? 'team'
    : sameName(single!.linkedin, single!.x)
      ? 'person'
      : (single!.x.speaksAs ?? 'person')
  const effectiveVoice: LinkVoice =
    voice === 'person' && !personAllowed ? 'team' : (voice ?? suggestedVoice)

  // A second profile fed by the same one is safer by hand: both networks
  // restrict accounts whose posts look alike.
  const autoElsewhere = (direction: 'toX' | 'toLinkedin') =>
    pairs.flatMap(({ linkedin, x }) =>
      others
        .filter((l) =>
          direction === 'toX'
            ? l.linkedin._id === linkedin._id &&
              l.x._id !== x._id &&
              l.mirror.linkedinToX === 'auto-draft'
            : l.x._id === x._id &&
              l.linkedin._id !== linkedin._id &&
              l.mirror.xToLinkedin === 'auto-draft'
        )
        .map((l) =>
          direction === 'toX'
            ? `${linkedin.name}'s posts already go to ${l.x.handle}`
            : `${x.handle}'s posts already go to ${l.linkedin.name}`
        )
    )
  const elsewhereToX = editing ? [] : autoElsewhere('toX')
  const elsewhereToLinkedin = editing ? [] : autoElsewhere('toLinkedin')
  const effectiveToX = toX ?? elsewhereToX.length === 0
  const effectiveToLinkedin = toLinkedin ?? elsewhereToLinkedin.length === 0

  const busy = linkMutation.isPending || updateMutation.isPending
  const canSave = pairs.length > 0 && !busy

  const save = () => {
    const settings = {
      linkedinToX: effectiveToX ? ('auto-draft' as const) : ('suggest' as const),
      xToLinkedin: effectiveToLinkedin
        ? ('auto-draft' as const)
        : ('suggest' as const),
      offsetHours,
    }
    if (editing) {
      updateMutation.mutate(
        { linkId: editing._id, voice: effectiveVoice, ...settings },
        { onSuccess: onClose }
      )
      return
    }
    linkMutation.mutate(
      {
        linkedinProfileIds: [...new Set(pairs.map((p) => p.linkedin._id))],
        xProfileIds: [...new Set(pairs.map((p) => p.x._id))],
        ...(single ? { voice: effectiveVoice } : {}),
        ...settings,
      },
      { onSuccess: onClose }
    )
  }

  const lock = editing ? 'both' : target.kind === 'new' ? target.lock : undefined
  const xOff = chosenX.filter((x) => !x.postingActive)
  const linkedinOff = chosenLinkedin.filter((p) => !p.postingActive)

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Link settings' : 'Link profiles'}</DialogTitle>
          <DialogDescription>
            Posts on one side get a version on the other, written for that
            network, for you to approve.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <ProfileColumn
              network='linkedin'
              profiles={data.profiles.linkedin}
              selected={linkedinSel}
              onChange={setLinkedinSel}
              locked={lock === 'both' || lock === 'linkedin'}
              alreadyLinked={(id) =>
                xSel.length === 1 && linked(id, xSel[0])
              }
            />
            <ProfileColumn
              network='twitter'
              profiles={data.profiles.x}
              selected={xSel}
              onChange={setXSel}
              locked={lock === 'both' || lock === 'twitter'}
              alreadyLinked={(id) =>
                linkedinSel.length === 1 && linked(linkedinSel[0], id)
              }
            />
          </div>

          {pairs.length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
                <p className='flex items-center gap-2 text-sm'>
                  {single && effectiveVoice === 'person' ? (
                    <IconUser className='text-muted-foreground size-4 shrink-0' />
                  ) : (
                    <IconBuilding className='text-muted-foreground size-4 shrink-0' />
                  )}
                  {single
                    ? effectiveVoice === 'person'
                      ? `${single.linkedin.name} and ${single.x.handle} are the same person`
                      : `${single.x.handle} is a company account; ${single.linkedin.name} posts as themselves`
                    : `${pairs.length} pairs, linked as company accounts`}
                </p>
                {single && (
                  <button
                    type='button'
                    className='text-primary shrink-0 text-xs font-medium hover:underline'
                    onClick={() => setShowVoice((v) => !v)}
                  >
                    {showVoice ? 'Done' : 'Change'}
                  </button>
                )}
              </div>
              {single && showVoice && (
                <div className='grid gap-2 sm:grid-cols-2'>
                  <VoiceOption
                    selected={effectiveVoice === 'person'}
                    disabled={!personAllowed}
                    icon={<IconUser className='size-4' />}
                    title='The same person'
                    hint={
                      personBlock ??
                      `Both sides written as ${single.linkedin.name}: "I…"`
                    }
                    onClick={() => setVoice('person')}
                  />
                  <VoiceOption
                    selected={effectiveVoice === 'team'}
                    icon={<IconBuilding className='size-4' />}
                    title={`${single.x.handle} is a company account`}
                    hint={`On X written as the company ("we…"); on LinkedIn as ${single.linkedin.name}, about it.`}
                    onClick={() => setVoice('team')}
                  />
                </div>
              )}
            </div>
          )}

          <div className='space-y-3 rounded-lg border p-3'>
            <Direction
              id='to-x'
              checked={effectiveToX}
              onChange={setToX}
              from='linkedin'
              title='LinkedIn posts get an X version'
              hint='Every LinkedIn post written from now on, for you to approve.'
              note={
                elsewhereToX.length
                  ? `${elsewhereToX.join('; ')} automatically. For another account we suggest drafting by hand: X restricts accounts whose posts look alike. Turned on, each still gets its own rewrite, a day apart.`
                  : undefined
              }
              blocked={
                effectiveToX && xOff.length
                  ? {
                      text: `X versions need X posting on ${xOff.map(label).join(', ')}.`,
                      agent: 'twitter-posting',
                    }
                  : undefined
              }
            />
            <Direction
              id='to-linkedin'
              checked={effectiveToLinkedin}
              onChange={setToLinkedin}
              from='twitter'
              title='X posts get a LinkedIn version'
              hint='Every X post written from now on, expanded for LinkedIn. At most one LinkedIn post a day, and never more than half your LinkedIn week.'
              note={
                elsewhereToLinkedin.length
                  ? `${elsewhereToLinkedin.join('; ')} automatically. For another profile we suggest drafting by hand: LinkedIn cuts posts that look alike. Turned on, each still gets its own rewrite, a day apart.`
                  : undefined
              }
              blocked={
                effectiveToLinkedin && linkedinOff.length
                  ? {
                      text: `LinkedIn versions need LinkedIn posting for ${linkedinOff.map(label).join(', ')}.`,
                      agent: 'linkedin-posting',
                    }
                  : undefined
              }
            />

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
            {editing
              ? 'Save'
              : pairs.length > 1
                ? `Link ${pairs.length} pairs`
                : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** One side of the dialog: a profile, or a checklist with search when long. */
function ProfileColumn({
  network,
  profiles,
  selected,
  onChange,
  locked,
  alreadyLinked,
}: {
  network: Network
  profiles: LinkedProfileSummary[]
  selected: string[]
  onChange: (ids: string[]) => void
  locked: boolean
  alreadyLinked: (id: string) => boolean
}) {
  const [search, setSearch] = useState('')
  const title = network === 'twitter' ? 'X' : 'LinkedIn'
  const query = flat(search)
  const list = profiles.filter(
    (p) => !query || flat(`${p.name} ${p.handle}`).includes(query)
  )

  return (
    <div className='space-y-2'>
      <p className='flex items-center gap-1.5 text-sm font-medium'>
        <PlatformIcon platform={network} />
        {title}
      </p>
      {locked || profiles.length <= 1 ? (
        <div className='space-y-2'>
          {(locked ? profiles.filter((p) => selected.includes(p._id)) : profiles).map(
            (p) => (
              <ProfileRow key={p._id} profile={p} />
            )
          )}
          {profiles.length === 0 && (
            <p className='text-muted-foreground text-sm'>
              Connect a {title} profile first.
            </p>
          )}
        </div>
      ) : (
        <div className='rounded-lg border'>
          {profiles.length > 6 && (
            <div className='relative border-b'>
              <IconSearch className='text-muted-foreground absolute top-2.5 left-3 size-4' />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${title}`}
                className='border-0 pl-9 shadow-none focus-visible:ring-0'
              />
            </div>
          )}
          <div className='max-h-56 divide-y overflow-y-auto'>
            {list.map((p) => {
              const done = alreadyLinked(p._id)
              return (
                <label
                  key={p._id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2',
                    done && 'cursor-default opacity-60'
                  )}
                >
                  <Checkbox
                    checked={done || selected.includes(p._id)}
                    disabled={done}
                    onCheckedChange={(v) =>
                      onChange(
                        v === true
                          ? [...selected, p._id]
                          : selected.filter((id) => id !== p._id)
                      )
                    }
                  />
                  <span className='min-w-0 flex-1 truncate text-sm'>
                    {label(p)}
                    <span className='text-muted-foreground ml-1.5 text-xs'>
                      {network === 'twitter' ? p.name : p.handle}
                    </span>
                  </span>
                  {done && (
                    <span className='text-muted-foreground text-xs'>Linked</span>
                  )}
                </label>
              )
            })}
            {list.length === 0 && (
              <p className='text-muted-foreground px-3 py-2 text-sm'>
                Nothing matches.
              </p>
            )}
          </div>
        </div>
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
  note,
  blocked,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  from: Network
  title: string
  hint: string
  note?: string
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
        {note && <p className='text-xs text-amber-600'>{note}</p>}
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
  disabled,
  icon,
  title,
  hint,
  onClick,
}: {
  selected: boolean
  disabled?: boolean
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
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'space-y-1 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
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
