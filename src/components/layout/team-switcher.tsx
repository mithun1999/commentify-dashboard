// src/components/team-switcher.tsx
import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
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
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { DisconnectAccountDialog } from '@/features/users/components/disconnect-account-dialog'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { IProfile } from '@/features/users/interface/profile.interface'
import {
  useGetAllProfileQuery,
  useLinkProfile,
} from '@/features/users/query/profile.query'

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: profiles, isLoading } = useGetAllProfileQuery()
  const { data: user } = useGetUserQuery()
  const [isLinking, setIsLinking] = useState(false)
  const { linkProfile } = useLinkProfile()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [profileToDelete, setProfileToDelete] = useState<IProfile | null>(null)

  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  const canConnectMultipleProfiles =
    user?.subscription?.quantity && user?.subscription?.quantity > 1

  const handleLinking = async () => {
    if (!canConnectMultipleProfiles) return
    setIsLinking(true)
    await linkProfile()
    setIsLinking(false)
  }

  // Cache and selection are cleaned up by the disconnect hook; the only thing
  // left to decide here is whether the user is looking at the account that
  // just went away.
  const handleDisconnected = (_result: unknown, disconnected: IProfile) => {
    setProfileToDelete(null)
    if (location.pathname.startsWith(`/agents/${disconnected._id}`)) {
      navigate({ to: '/' })
    }
  }

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
          <SidebarMenuButton size='lg' asChild className='gap-2 border'>
            <Link to='/'>
              <Plus className='h-5 w-5' />
              Add Agent
            </Link>
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
                      @{activeProfile.platform === 'twitter' ? activeProfile.screenName : activeProfile.publicIdentifier}
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
              Profiles
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
                    {profile.platform === 'twitter' && profile.screenName
                      ? `@${profile.screenName}`
                      : `${profile.firstName} ${profile.lastName}`}
                  </div>
                  <div className={`text-xs ${getStatusColor(profile.status)}`}>
                    {profile.status === ProfileStatusEnum.OK
                      ? 'Connected'
                      : profile.status === ProfileStatusEnum.ACTION_REQUIRED
                        ? 'Disconnected'
                        : 'Inactive'}
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
                    aria-label={`Disconnect ${profile.firstName} ${profile.lastName}`}
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
      <DisconnectAccountDialog
        profile={profileToDelete}
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open)
          if (!open) setProfileToDelete(null)
        }}
        onDisconnected={handleDisconnected}
      />
    </SidebarMenu>
  )
}
