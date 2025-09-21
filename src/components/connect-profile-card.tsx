import { getProfileDetailsFromExtension } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLinkProfile } from '@/features/users/query/profile.query'

export function ConnectProfileCard() {
  const { linkProfile, isLinkingProfile } = useLinkProfile()

  const handleConnect = async () => {
    const profileDetails = await getProfileDetailsFromExtension()
    linkProfile(profileDetails)
  }

  return (
    <div className='flex h-full w-full items-center'>
      <div className='w-full p-4 text-center'>
        <Card>
          <CardHeader>
            <CardTitle>Connect your LinkedIn profile</CardTitle>
            <CardDescription>
              To use Commentify, first connect a LinkedIn profile.
            </CardDescription>
          </CardHeader>
          <CardContent className='mt-4'>
            <Button onClick={handleConnect} disabled={isLinkingProfile}>
              {isLinkingProfile ? 'Connecting…' : 'Connect LinkedIn Profile'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConnectProfileCard
