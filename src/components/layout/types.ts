interface User {
  name: string
  email: string
  avatar: string
}

interface BaseNavItem {
  title: string
  badge?: string
  icon?: React.ElementType
  /** Shown with a lock and an upgrade tooltip to accounts not on Pro. */
  requiresPro?: boolean
  /** The tooltip a locked item shows. */
  lockedHint?: string
  /** Set at render time when the account's plan does not include the item. */
  locked?: boolean
}

type NavLink = BaseNavItem & {
  url: string
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
  title?: string
  items: NavItem[]
}

interface BottomGroups {
  title?: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  navGroups: NavGroup[]
  bottomGroups: BottomGroups[]
}

export type {
  SidebarData,
  NavGroup,
  NavItem,
  NavCollapsible,
  NavLink,
  BottomGroups,
}
