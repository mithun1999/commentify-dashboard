import { useEffect, useMemo, useState } from 'react'
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

/**
 * A new link, optionally starting from an X account and/or LinkedIn
 * profiles (locked when the caller is about one of them), or the settings
 * of an existing link.
 */
export type LinkDialogTarget =
  | {
      kind: 'new'
      xId?: string
      linkedinIds?: string[]
      lockX?: boolean
      lockLinkedin?: boolean
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

/**
 * The one dialog for linking LinkedIn profiles to an X account, from the
 * Linked profiles page, the hub, the X calendar and the post editor. It
 * covers a solo founder (their two accounts), a company (several people into
 * one X account) and one person feeding several X accounts, and decides the
 * sensible defaults so most people only press Link.
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

  const [xId, setXId] = useState(
    editing?.x._id ??
      (target.kind === 'new' ? target.xId : undefined) ??
      (data.profiles.x.length === 1 ? data.profiles.x[0]._id : '')
  )
  const [selected, setSelected] = useState<string[]>(
    editing
      ? [editing.linkedin._id]
      : target.kind === 'new' && target.linkedinIds?.length
        ? target.linkedinIds
        : data.profiles.linkedin.length === 1
          ? [data.profiles.linkedin[0]._id]
          : []
  )
  const [search, setSearch] = useState('')
  const [voice, setVoice] = useState<LinkVoice | null>(editing?.voice ?? null)
  const [autoDraft, setAutoDraft] = useState<boolean | null>(
    editing ? editing.mirror.linkedinToX === 'auto-draft' : null
  )
  const [offsetHours, setOffsetHours] = useState(
    editing?.mirror.offsetHours ?? 2
  )

  const x = data.profiles.x.find((p) => p._id === xId)
  const linkedinById = useMemo(
    () => new Map(data.profiles.linkedin.map((p) => [p._id, p])),
    [data.profiles.linkedin]
  )
  const chosen = selected
    .map((id) => linkedinById.get(id))
    .filter(Boolean) as LinkedProfileSummary[]
  const others = data.links.filter((l) => l._id !== editing?._id)

  // Already feeding this X account: shown ticked, nothing to do.
  const alreadyLinked = new Set(
    others.filter((l) => l.x._id === xId).map((l) => l.linkedin._id)
  )
  const toLink = editing
    ? chosen
    : chosen.filter((p) => !alreadyLinked.has(p._id))

  // A person has one own X account, and an X account one owner.
  const ownerOfX = others.find((l) => l.x._id === xId && l.voice === 'person')
  const ownXOf = (linkedinId: string) =>
    others.find((l) => l.linkedin._id === linkedinId && l.voice === 'person')
  const single = toLink.length === 1 ? toLink[0] : undefined
  const personBlock = !single
    ? toLink.length > 1
      ? 'Several people share it, so it is a company account.'
      : null
    : ownerOfX && ownerOfX.linkedin._id !== single._id
      ? `${x?.handle} is already ${ownerOfX.linkedin.name}'s own account.`
      : ownXOf(single._id) && ownXOf(single._id)!.x._id !== xId
        ? `${single.name}'s own X account is ${ownXOf(single._id)!.x.handle}.`
        : null
  const personAllowed = !!single && !personBlock
  // Worked out as the backend does: matching names, then how the X account
  // writes in its own posts. The author only changes it when it's wrong.
  const suggestedVoice: LinkVoice = !personAllowed
    ? 'team'
    : sameName(single, x)
      ? 'person'
      : (x?.speaksAs ?? 'person')
  const effectiveVoice: LinkVoice =
    voice === 'person' && !personAllowed ? 'team' : (voice ?? suggestedVoice)
  const [showVoice, setShowVoice] = useState(false)

  // Automatic for a second X account is off unless asked for: X restricts
  // accounts whose posts look alike.
  const autoElsewhere = toLink.flatMap((p) =>
    others
      .filter(
        (l) =>
          l.linkedin._id === p._id &&
          l.x._id !== xId &&
          l.mirror.linkedinToX === 'auto-draft'
      )
      .map((l) => ({ name: p.name, handle: l.x.handle }))
  )
  const effectiveAuto = autoDraft ?? autoElsewhere.length === 0

  // A new X account starts the choices over.
  useEffect(() => {
    if (!editing) setVoice(null)
  }, [xId, editing])

  const busy = linkMutation.isPending || updateMutation.isPending
  const canSave = !!x && toLink.length > 0 && !busy

  const save = () => {
    const settings = {
      voice: effectiveVoice,
      linkedinToX: effectiveAuto ? ('auto-draft' as const) : ('suggest' as const),
      offsetHours,
    }
    if (editing) {
      updateMutation.mutate(
        { linkId: editing._id, ...settings },
        { onSuccess: onClose }
      )
    } else {
      linkMutation.mutate(
        {
          linkedinProfileIds: toLink.map((p) => p._id),
          xProfileId: xId,
          ...settings,
        },
        { onSuccess: onClose }
      )
    }
  }

  const lockX = !!editing || (target.kind === 'new' && target.lockX)
  const lockLinkedin = !!editing || (target.kind === 'new' && target.lockLinkedin)
  const authorLabel =
    toLink.length === 1 ? toLink[0].name : toLink.length > 1 ? 'the team' : 'them'
  const query = flat(search)
  const linkedinList = data.profiles.linkedin.filter(
    (p) => !query || flat(`${p.name} ${p.handle}`).includes(query)
  )

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Link settings' : 'Link profiles'}</DialogTitle>
          <DialogDescription>
            LinkedIn posts get an X version on the X account, written for X,
            for you to approve.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          {/* X account */}
          <Field label='X account'>
            {lockX || data.profiles.x.length <= 1 ? (
              x ? (
                <ProfileRow profile={x} />
              ) : (
                <p className='text-muted-foreground text-sm'>
                  Connect an X account first.
                </p>
              )
            ) : (
              <Select value={xId} onValueChange={setXId}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose an X account' />
                </SelectTrigger>
                <SelectContent>
                  {data.profiles.x.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.handle}
                      {p.name && p.name !== p.handle.slice(1)
                        ? ` · ${p.name}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {/* LinkedIn profiles */}
          <Field
            label={
              lockLinkedin ? 'LinkedIn profile' : 'LinkedIn profiles that feed it'
            }
          >
            {lockLinkedin ? (
              <div className='space-y-2'>
                {chosen.map((p) => (
                  <ProfileRow key={p._id} profile={p} />
                ))}
              </div>
            ) : (
              <div className='rounded-lg border'>
                {data.profiles.linkedin.length > 6 && (
                  <div className='relative border-b'>
                    <IconSearch className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder='Search LinkedIn profiles'
                      className='border-0 pl-9 shadow-none focus-visible:ring-0'
                    />
                  </div>
                )}
                <div className='max-h-56 divide-y overflow-y-auto'>
                  {linkedinList.map((p) => {
                    const linked = alreadyLinked.has(p._id)
                    const checked = linked || selected.includes(p._id)
                    return (
                      <label
                        key={p._id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2',
                          linked && 'cursor-default opacity-60'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={linked}
                          onCheckedChange={(v) =>
                            setSelected((prev) =>
                              v === true
                                ? [...prev, p._id]
                                : prev.filter((id) => id !== p._id)
                            )
                          }
                        />
                        <IconBrandLinkedin className='size-4 shrink-0 text-[#0A66C2]' />
                        <span className='min-w-0 flex-1 truncate text-sm'>
                          {p.name}
                          <span className='text-muted-foreground ml-1.5 text-xs'>
                            {p.handle}
                          </span>
                        </span>
                        {linked && (
                          <span className='text-muted-foreground text-xs'>
                            Linked
                          </span>
                        )}
                      </label>
                    )
                  })}
                  {linkedinList.length === 0 && (
                    <p className='text-muted-foreground px-3 py-2 text-sm'>
                      No LinkedIn profiles match.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Field>

          {/* Whose account: worked out, shown as one line, changeable. */}
          {x && toLink.length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
                <p className='flex items-center gap-2 text-sm'>
                  {effectiveVoice === 'person' ? (
                    <IconUser className='text-muted-foreground size-4 shrink-0' />
                  ) : (
                    <IconBuilding className='text-muted-foreground size-4 shrink-0' />
                  )}
                  {effectiveVoice === 'person'
                    ? `Written as ${single?.name ?? 'them'}, in first person`
                    : `Written as ${x.handle}, the company account${toLink.length === 1 ? `, naming ${authorLabel} where it fits` : ''}`}
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
                    disabled={!personAllowed}
                    icon={<IconUser className='size-4' />}
                    title={single ? `${single.name}'s own account` : "One person's own account"}
                    hint={personBlock ?? `Written as ${single?.name ?? 'them'}: "I…"`}
                    onClick={() => setVoice('person')}
                  />
                  <VoiceOption
                    selected={effectiveVoice === 'team'}
                    icon={<IconBuilding className='size-4' />}
                    title='A company or brand account'
                    hint={`Written as ${x.handle}: "we…", naming ${authorLabel} where it fits.`}
                    onClick={() => setVoice('team')}
                  />
                </div>
              )}
            </div>
          )}

          {/* How */}
          <div className='space-y-4 rounded-lg border p-3'>
            <div className='flex items-start gap-3'>
              <Checkbox
                id='mirror-auto'
                checked={effectiveAuto}
                onCheckedChange={(v) => setAutoDraft(v === true)}
                className='mt-0.5'
              />
              <div className='space-y-1'>
                <Label htmlFor='mirror-auto' className='text-sm font-medium'>
                  Draft X versions automatically
                </Label>
                <p className='text-muted-foreground text-xs'>
                  Every LinkedIn post written from now on gets one, for you to
                  approve. Each uses one X generation. Posts you already have,
                  or all of them when this is off, get one from the post
                  itself.
                </p>
                {autoElsewhere.length > 0 && (
                  <p className='text-xs text-amber-600'>
                    {autoElsewhere
                      .map((a) => `${a.name}'s posts already go to ${a.handle}`)
                      .join('; ')}{' '}
                    automatically. For a second account we suggest drafting by
                    hand: X restricts accounts whose posts look alike. Turned
                    on, each account still gets its own rewrite, at least a day
                    apart.
                  </p>
                )}
              </div>
            </div>

            <div className='flex flex-wrap items-center justify-between gap-2'>
              <Label className='text-sm font-normal'>Post the X version</Label>
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
                  after LinkedIn
                </span>
              </div>
            </div>

            {x && !x.postingActive && (
              <p className='text-xs text-amber-600'>
                X posting is off for {x.handle}. Turn it on to get X versions.
              </p>
            )}
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
              : toLink.length > 1
                ? `Link ${toLink.length} profiles`
                : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>{label}</p>
      {children}
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
  platform: 'linkedin' | 'twitter'
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
        <p className='truncate text-sm font-medium'>
          {profile.platform === 'twitter' ? profile.handle : profile.name}
        </p>
        <p className='text-muted-foreground truncate text-xs'>
          {profile.platform === 'twitter' ? profile.name : profile.handle}
        </p>
      </div>
    </div>
  )
}
