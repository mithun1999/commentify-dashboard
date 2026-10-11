import { useEffect, useState } from 'react'
import {
  IconArrowsLeftRight,
  IconBrandLinkedin,
  IconBrandX,
  IconLoader2,
} from '@tabler/icons-react'
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
  type LinkedProfileSummary,
  type ProfileLink,
} from '../api/profile-links.api'
import {
  useLinkProfiles,
  useUpdateProfileLink,
} from '../query/profile-links.query'

/** A new link from a pair, or the settings of an existing one. */
export type LinkDialogTarget =
  | {
      kind: 'new'
      linkedin: LinkedProfileSummary[]
      x: LinkedProfileSummary[]
      preselect?: { linkedinId?: string; xId?: string }
    }
  | { kind: 'edit'; link: ProfileLink }

interface LinkProfilesDialogProps {
  target: LinkDialogTarget | null
  onOpenChange: (open: boolean) => void
}

const hoursLabel = (h: number) => (h === 1 ? '1 hour' : `${h} hours`)

/**
 * The one confirmation for linking a LinkedIn and an X profile as the same
 * person, reached from the Linked profiles page, the hub card, the X
 * calendar prompt and the post editor. Editing a link's settings reuses it;
 * unlinking lives on the Linked profiles page.
 */
export function LinkProfilesDialog({
  target,
  onOpenChange,
}: LinkProfilesDialogProps) {
  const linkMutation = useLinkProfiles()
  const updateMutation = useUpdateProfileLink()

  const [linkedinId, setLinkedinId] = useState('')
  const [xId, setXId] = useState('')
  const [autoDraft, setAutoDraft] = useState(true)
  const [offsetHours, setOffsetHours] = useState(2)

  useEffect(() => {
    if (!target) return
    if (target.kind === 'edit') {
      setLinkedinId(target.link.linkedin._id)
      setXId(target.link.x._id)
      setAutoDraft(target.link.mirror.linkedinToX === 'auto-draft')
      setOffsetHours(target.link.mirror.offsetHours)
    } else {
      setLinkedinId(target.preselect?.linkedinId ?? target.linkedin[0]?._id ?? '')
      setXId(target.preselect?.xId ?? target.x[0]?._id ?? '')
      setAutoDraft(true)
      setOffsetHours(2)
    }
  }, [target])

  if (!target) return null

  const linkedinOptions =
    target.kind === 'edit' ? [target.link.linkedin] : target.linkedin
  const xOptions = target.kind === 'edit' ? [target.link.x] : target.x
  const x = xOptions.find((p) => p._id === xId)
  const busy = linkMutation.isPending || updateMutation.isPending

  const close = () => onOpenChange(false)
  const save = () => {
    const settings = {
      linkedinToX: autoDraft ? ('auto-draft' as const) : ('suggest' as const),
      offsetHours,
    }
    if (target.kind === 'edit') {
      updateMutation.mutate(
        { linkId: target.link._id, ...settings },
        { onSuccess: close }
      )
    } else {
      linkMutation.mutate(
        { linkedinProfileId: linkedinId, xProfileId: xId, ...settings },
        { onSuccess: close }
      )
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {target.kind === 'edit' ? 'Linked profiles' : 'Link profiles'}
          </DialogTitle>
          <DialogDescription>
            The same person on LinkedIn and X. Linked, your LinkedIn posts can
            get an X version, written for X in your X voice.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center gap-2'>
          <ProfilePicker
            platform='linkedin'
            options={linkedinOptions}
            value={linkedinId}
            onChange={setLinkedinId}
          />
          <IconArrowsLeftRight className='text-muted-foreground size-4 shrink-0' />
          <ProfilePicker
            platform='twitter'
            options={xOptions}
            value={xId}
            onChange={setXId}
          />
        </div>

        <div className='space-y-4 rounded-lg border p-3'>
          <div className='flex items-start gap-3'>
            <Checkbox
              id='mirror-auto'
              checked={autoDraft}
              onCheckedChange={(v) => setAutoDraft(v === true)}
              className='mt-0.5'
            />
            <div className='space-y-1'>
              <Label htmlFor='mirror-auto' className='text-sm font-medium'>
                Draft an X version of every LinkedIn post
              </Label>
              <p className='text-muted-foreground text-xs'>
                You approve each one before it goes out. Each uses one X
                generation. Off, you can still draft one from any LinkedIn
                post.
              </p>
            </div>
          </div>

          <div className='flex items-center justify-between gap-3'>
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
              Turn on X posting for {x.handle} to get X versions.
            </p>
          )}
        </div>

        <DialogFooter className='gap-2'>
          <Button variant='outline' disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button disabled={busy || !linkedinId || !xId} onClick={save}>
            {busy && <IconLoader2 className='mr-1 size-4 animate-spin' />}
            {target.kind === 'edit' ? 'Save' : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <IconBrandLinkedin className={className ?? 'size-4 text-[#0A66C2]'} />
  )
}

/** One profile, or a choice between several (agencies). */
function ProfilePicker({
  platform,
  options,
  value,
  onChange,
}: {
  platform: 'linkedin' | 'twitter'
  options: LinkedProfileSummary[]
  value: string
  onChange: (id: string) => void
}) {
  if (options.length <= 1) {
    const p = options[0]
    return (
      <div className='flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2'>
        <PlatformIcon platform={platform} />
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>{p?.name || p?.handle}</p>
          <p className='text-muted-foreground truncate text-xs'>{p?.handle}</p>
        </div>
      </div>
    )
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-2'>
          <PlatformIcon platform={platform} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p._id} value={p._id}>
            {p.name || p.handle}
            {platform === 'twitter' ? ` (${p.handle})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
