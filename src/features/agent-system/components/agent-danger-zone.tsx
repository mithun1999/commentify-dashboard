import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IconPlugConnectedX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { DisconnectAccountDialog } from '@/features/users/components/disconnect-account-dialog'
import type { IProfile } from '@/features/users/interface/profile.interface'
import { profileDisplayName } from '@/features/users/utils/profile-display'

/**
 * Agent Settings danger zone. Disconnect acts on the whole connected account
 * (all agents on it), which is why it lives here beside the per-agent pause
 * rather than as a "remove agent" control.
 */
export function AgentDangerZone({ profile }: { profile: IProfile | null }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!profile) return null

  const platformLabel = profile.platform === 'twitter' ? 'X' : 'LinkedIn'

  return (
    <section className='border-destructive/30 mt-10 rounded-lg border p-4'>
      <h3 className='text-destructive text-sm font-semibold'>Danger zone</h3>
      <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm'>
          <p className='font-medium'>
            Disconnect {profileDisplayName(profile)}
          </p>
          <p className='text-muted-foreground'>
            Removes Commentify's access to this {platformLabel} account and
            stops every agent on it. Drafts and history are kept.
          </p>
        </div>
        <Button
          variant='destructive'
          size='sm'
          onClick={() => setOpen(true)}
          className='shrink-0'
        >
          <IconPlugConnectedX className='mr-1.5 size-4' />
          Disconnect account
        </Button>
      </div>
      <DisconnectAccountDialog
        profile={profile}
        open={open}
        onOpenChange={setOpen}
        onDisconnected={() => navigate({ to: '/' })}
      />
    </section>
  )
}
