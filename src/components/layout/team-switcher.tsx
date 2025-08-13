// src/components/team-switcher.tsx
import { useState } from 'react'
import { LinkedInLogoIcon } from '@radix-ui/react-icons'
import { ChevronsUpDown, Plus } from 'lucide-react'
// import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
// import { useAuthStore } from '@/stores/auth.store'
import { getProfileDetailsFromExtension } from '@/utils/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import {
  // useDeleteProfile,
  useLinkProfile,
} from '@/features/users/query/profile.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { data: profiles, isLoading } = useGetAllProfileQuery()
  const { data: user } = useGetUserQuery()
  const [isLinking, setIsLinking] = useState(false)
  const { isLinkingProfile, linkProfile } = useLinkProfile()

  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  const canConnectMultipleProfiles =
    user?.subscription?.quantity && user?.subscription?.quantity > 1

  const handleLinking = async () => {
    if (!canConnectMultipleProfiles) return
    setIsLinking(true)
    const profileDetails = await getProfileDetailsFromExtension()
    await linkProfile(profileDetails)
    setIsLinking(false)
  }

  // no-op

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg'>Loading</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            onClick={handleLinking}
            className='gap-2'
          >
            <LinkedInLogoIcon className='h-5 w-5' />
            {isLinking || isLinkingProfile
              ? 'Connecting...'
              : 'Connect Linkedin Profile'}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const getStatusColor = (status: ProfileStatusEnum) => {
    switch (status) {
      case ProfileStatusEnum.OK:
        return 'text-green-600'
      case ProfileStatusEnum.ACTION_REQUIRED:
        return 'text-red-600'
      case ProfileStatusEnum.DEACTIVATED:
        return 'text-yellow-600'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              {activeProfile && (
                <>
                  <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                    <span className='text-sm font-bold'>
                      {activeProfile.firstName.charAt(0)}
                      {activeProfile.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold'>
                      {activeProfile.firstName} {activeProfile.lastName}
                    </span>
                    <span className='truncate text-xs'>
                      @{activeProfile.publicIdentifier}
                    </span>
                  </div>
                </>
              )}
              <ChevronsUpDown className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              LinkedIn Profiles
            </DropdownMenuLabel>
            {(profiles || []).map((profile) => (
              <DropdownMenuItem
                key={profile._id}
                onClick={() => setActiveProfile(profile)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <span className='text-xs'>
                    {profile.firstName.charAt(0)}
                    {profile.lastName.charAt(0)}
                  </span>
                </div>
                <div className='flex-1'>
                  <div className='font-medium'>
                    {profile.firstName} {profile.lastName}
                  </div>
                  <div className={`text-xs ${getStatusColor(profile.status)}`}>
                    {profile.status === ProfileStatusEnum.OK
                      ? 'Connected'
                      : profile.status === ProfileStatusEnum.ACTION_REQUIRED
                        ? 'Disconnected'
                        : 'Deactivated'}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  className='gap-2 p-2'
                  disabled={isLinking}
                  onClick={(e) => {
                    if (!canConnectMultipleProfiles) {
                      e.preventDefault()
                      e.stopPropagation()
                      return
                    }
                    void handleLinking()
                  }}
                >
                  <div className='bg-background flex size-6 items-center justify-center rounded-md border'>
                    <Plus className='size-4' />
                  </div>
                  <div className='text-muted-foreground font-medium'>
                    {isLinking ? 'Connecting...' : 'Connect new profile'}
                  </div>
                </DropdownMenuItem>
              </TooltipTrigger>
              {!canConnectMultipleProfiles && (
                <TooltipContent side='right' sideOffset={8} className='z-[60]'>
                  Purchase the Agency plan to connect multiple profiles
                </TooltipContent>
              )}
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
