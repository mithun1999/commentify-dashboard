import {
  IconBubbleText,
  IconCash,
  IconHome,
  IconPlugConnected,
} from '@tabler/icons-react'
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
          icon: IconHome,
        },
        {
          title: 'AI tools',
          url: '/ai-tools',
          icon: IconPlugConnected,
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
          icon: IconBubbleText,
        },
        {
          title: 'Billing',
          url: '/billing',
          icon: IconCash,
        },
      ],
    },
  ],
}
