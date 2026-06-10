import { useEffect, useMemo, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, Sparkles, CreditCard, Settings } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { signOut } from '@/features/auth/utils/auth.util'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import type { IUser } from '@/features/auth/interface/user.interface'
import { getAgentPlanTier } from '@/features/agent-system/registry'

type UpgradeInfo = { label: string; to: '/plans' }

/**
 * Next upgrade step for the navbar CTA, read from the per-agent entitlements
 * (`user.agents`) rather than naively parsing the base-product SKU. Commenting
 * climbs starter→pro→premium; posting tops out at pro. Falls back to the
 * commenting tier parsed from the base product for legacy subscribers synced
 * before per-agent entitlements existed.
 */
function getUpgradeInfo(user?: IUser): UpgradeInfo | null {
  if (!user) return null

  const agents = user.agents
  if (!agents || Object.keys(agents).length === 0) {
    const tier = getAgentPlanTier(user, 'comment')
    if (tier === 'premium') return null
    return { label: tier === 'pro' ? 'Upgrade to Premium' : 'Upgrade to Pro', to: '/plans' }
  }

  if (agents.comment && agents.comment.tier !== 'premium') {
    return {
      label: agents.comment.tier === 'pro' ? 'Upgrade to Premium' : 'Upgrade to Pro',
      to: '/plans',
    }
  }
  if (agents.post && agents.post.tier !== 'pro') {
    return { label: 'Upgrade to Pro', to: '/plans' }
  }
  return null
}

export function NavUser() {
  const posthog = usePostHog()
  const { isMobile } = useSidebar()
  const router = useRouter()
  const session = useAuthStore((state) => state.session)
  const { data: appUser } = useGetUserQuery()
  const [user, setUser] = useState<{
    name: string
    email: string
    avatar?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const upgradeInfo = useMemo(() => getUpgradeInfo(appUser), [appUser])

  useEffect(() => {
    if (session?.user) {
      setUser({
        name:
          session.user.user_metadata?.full_name || session.user.email || 'User',
        email: session.user.email || '',
        avatar: session.user.user_metadata?.avatar_url,
      })
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [session])

  const handleLogout = async () => {
    await signOut()
    router.navigate({ to: '/sign-in' })
  }

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg'>Loading...</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' asChild>
            <Link to='/sign-in'>Sign In</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
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
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='rounded-lg'>
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-10 w-10 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            {upgradeInfo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={upgradeInfo.to}
                    className='w-full'
                    onClick={() =>
                      posthog?.capture('upgrade_plan_navbar_clicked')
                    }
                  >
                    <Sparkles className='mr-2 h-4 w-4' />
                    {upgradeInfo.label}
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to='/settings/post' className='w-full'>
                  <Settings className='mr-2 h-4 w-4' />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/billing' className='w-full'>
                  <CreditCard className='mr-2 h-4 w-4' />
                  Billing
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='text-red-600 focus:bg-red-50 focus:text-red-600'
              onClick={handleLogout}
            >
              <LogOut className='mr-2 h-4 w-4' />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
