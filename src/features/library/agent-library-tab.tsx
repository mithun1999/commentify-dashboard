import { useParams } from '@tanstack/react-router'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  usePostingPreferences,
  useUpdatePostingPreferences,
} from '@/features/post-generator/query/post-generator.query'
import { LibraryBrowser } from './components/library-browser'

type Usage = 'off' | 'when-relevant' | 'prefer'

const USAGE_HINT: Record<Usage, string> = {
  off: 'Only notes you pin are used.',
  'when-relevant': 'A note is used when it fits a topic the week covers anyway.',
  prefer: 'At least half of each week is built on your notes.',
}

/** A posting agent's Library tab: the notes this profile may use, and how much. */
export function AgentLibraryTab() {
  const { profileId } = useParams({ strict: false }) as { profileId: string }
  const { data: prefs } = usePostingPreferences(profileId)
  const updatePrefs = useUpdatePostingPreferences()
  const usage: Usage = prefs?.libraryUsage ?? 'when-relevant'

  return (
    <div className='mx-auto max-w-3xl space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'>
        <div className='space-y-0.5'>
          <Label className='text-sm font-medium'>Use the library for this profile</Label>
          <p className='text-muted-foreground text-xs'>{USAGE_HINT[usage]}</p>
        </div>
        <Select
          value={usage}
          onValueChange={(v) =>
            updatePrefs.mutate({ profileId, prefs: { libraryUsage: v as Usage } })
          }
        >
          <SelectTrigger className='w-[170px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='off'>Pinned notes only</SelectItem>
            <SelectItem value='when-relevant'>When relevant</SelectItem>
            <SelectItem value='prefer'>Prefer my notes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <LibraryBrowser profileId={profileId} />
    </div>
  )
}
