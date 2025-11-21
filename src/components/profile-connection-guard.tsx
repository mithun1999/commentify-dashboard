// no explicit React import needed
import { useProfileStore } from '@/stores/profile.store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { useLinkProfile } from '@/features/users/query/profile.query'

export function ProfileConnectionGuard() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { linkProfile, isLinkingProfile } = useLinkProfile()

  const isDisconnected =
    activeProfile?.status === ProfileStatusEnum.ACTION_REQUIRED

  const handleReconnect = async () => {
    await linkProfile()
  }

  return (
    <Dialog open={Boolean(isDisconnected)} modal={false}>
      <DialogContent
        hideCloseButton
        hideOverlay={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>We lost touch with LinkedIn 😢</DialogTitle>
          <DialogDescription>
            Your LinkedIn connection expired or was revoked. Let’s reconnect so
            you can keep getting the most out of Commentify.
          </DialogDescription>
        </DialogHeader>
        <div className='flex justify-end'>
          <Button onClick={handleReconnect} disabled={isLinkingProfile}>
            {isLinkingProfile ? 'Reconnecting…' : 'Reconnect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProfileConnectionGuard
