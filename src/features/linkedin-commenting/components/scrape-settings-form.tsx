import { useEffect } from 'react'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { PostForm } from '@/features/settings/post/post-form'

export function LinkedInScrapeSettings({ profileId }: { profileId: string }) {
  const { data: profiles } = useGetAllProfileQuery()
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  useEffect(() => {
    const profile = profiles?.find((p) => p._id === profileId)
    if (profile) setActiveProfile(profile)
  }, [profileId, profiles, setActiveProfile])

  return <PostForm />
}
