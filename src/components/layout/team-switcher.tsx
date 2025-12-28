// src/components/team-switcher.tsx
import { useState } from 'react'
import { LinkedInLogoIcon } from '@radix-ui/react-icons'
import { envConfig } from '@/config/env.config'
import { ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
// import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
// import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { GET_BROWSER_DETAILS, GET_COOKIES } from '@/features/users/constants/browserEvents.constant'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { IProfile } from '@/features/users/interface/profile.interface'
import {
  useDeleteProfile,
  useLinkProfile,
} from '@/features/users/query/profile.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { data: profiles, isLoading } = useGetAllProfileQuery()
  const { data: user } = useGetUserQuery()
  const [isLinking, setIsLinking] = useState(false)
  const { isLinkingProfile, linkProfile } = useLinkProfile()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [profileToDelete, setProfileToDelete] = useState<IProfile | null>(null)

  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  const canConnectMultipleProfiles =
    user?.subscription?.quantity && user?.subscription?.quantity > 1

  const getProfileDetailsFromExtension = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeRef: any =
        typeof window !== 'undefined' ? (window as any).chrome : undefined
      const runtime = chromeRef?.runtime
      const sendMessage = runtime?.sendMessage

      if (typeof sendMessage !== 'function') {
        reject(new Error('Chrome extension runtime is not available'))
        return
      }

      sendMessage(
        envConfig.chromeExtensionId,
        { type: GET_BROWSER_DETAILS, url: 'https://www.linkedin.com' },
        (response: any) => {
          if (runtime?.lastError) {
            reject(runtime.lastError.message)
          } else {
            resolve(response)
          }
        }
      )
    })
  }

  const handleLinking = async () => {
    const details = await getProfileDetailsFromExtension()
    console.log('details', details)
    /*     if (!canConnectMultipleProfiles) return
    setIsLinking(true)
    await linkProfile()
    setIsLinking(false) */
  }

  const handleSuccessDeleteProfile = () => {
    setActiveProfile(null)
    window.location.reload()
  }

  const { deleteProfile, isDeletingProfile } = useDeleteProfile({
    onSuccess: handleSuccessDeleteProfile,
  })

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
            className='gap-2 border'
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
            className='z-100 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
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
                <div className='ml-auto flex items-center'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-destructive h-8 w-8'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setProfileToDelete(profile)
                      setIsConfirmOpen(true)
                    }}
                    disabled={isDeletingProfile}
                  >
                    <Trash2 className='size-4' />
                  </Button>
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
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open)
          if (!open) setProfileToDelete(null)
        }}
        destructive
        title='Delete profile'
        desc={`Are you sure you want to delete ${profileToDelete ? `"${profileToDelete.firstName}" profile` : 'this profile'}? This action cannot be undone.`}
        isLoading={isDeletingProfile}
        handleConfirm={() => {
          if (profileToDelete) {
            if (activeProfile?._id === profileToDelete._id) {
              setActiveProfile(null)
            }
            deleteProfile(profileToDelete._id)
          }
          setIsConfirmOpen(false)
        }}
        confirmText='Delete'
      />
    </SidebarMenu>
  )
}
