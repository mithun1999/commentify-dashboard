import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavAgents } from '@/components/layout/nav-agents'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { useTheme } from '@/context/theme-context'
import { sidebarData } from './data/sidebar-data'
import logoWhite from '@/assets/images/logo.svg'
import logoBlack from '@/assets/images/logo-black.svg'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader className='px-4 pt-6 pb-4'>
        <img
          src={isDark ? logoWhite : logoBlack}
          alt='Commentify'
          className='h-5 w-auto'
        />
      </SidebarHeader>

      <SidebarContent>
        {sidebarData.navGroups.map((props, index) => (
          <NavGroup key={index} {...props} />
        ))}
        <NavAgents />
      </SidebarContent>

      {sidebarData.bottomGroups.map((props, index) => (
        <NavGroup key={index} {...props} />
      ))}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
