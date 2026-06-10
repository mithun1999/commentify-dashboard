import {
  IconBubbleText,
  IconCash,
  IconHome,
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
