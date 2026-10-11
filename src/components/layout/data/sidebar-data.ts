import {
  BookOpen,
  CreditCard,
  LayoutGrid,
  Link2,
  Sparkles,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Commentify',
    email: 'commentify@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },

  navGroups: [
    {
      items: [
        {
          title: 'Agent Hub',
          url: '/',
          icon: LayoutGrid,
        },
        {
          title: 'Library',
          url: '/library',
          icon: BookOpen,
          requiresPosting: true,
        },
        {
          title: 'Linked profiles',
          url: '/linked-profiles',
          icon: Link2,
          requiresLinkablePair: true,
        },
        {
          title: 'AI tools',
          url: '/ai-tools',
          icon: Sparkles,
          requiresPro: true,
          lockedHint:
            'Part of the Pro plan. Upgrade to use Commentify from Claude, ChatGPT and Cursor.',
        },
      ],
    },
  ],
  bottomGroups: [
    {
      items: [
        {
          title: 'Join Community',
          url: 'https://chat.whatsapp.com/HZ65AMvN24YEtBSvswLlcT',
          icon: Users,
        },
        {
          title: 'Billing',
          url: '/billing',
          icon: CreditCard,
        },
      ],
    },
  ],
}
