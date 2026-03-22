import { IconBrandLinkedin } from '@tabler/icons-react'
import { AGENT_TYPES } from '@/features/agent-system/registry'
import { getPostColumns } from '@/features/history/components/columns'
import { LinkedInScrapeSettings } from './components/scrape-settings-form'
import { LinkedInCommentSettings } from './components/comment-settings-form'

const PlaceholderQueueItem = () => null

AGENT_TYPES['linkedin-commenting'] = {
  slug: 'linkedin-commenting',
  name: 'LinkedIn Commenting',
  description:
    'Automatically find and comment on relevant LinkedIn posts to grow your network and visibility.',
  icon: IconBrandLinkedin,
  platform: 'linkedin',
  access: 'invite-only',
  badge: 'Invite Only',
  isEligible: (user) => {
    const plan = user.subscribedProduct?.name?.toLowerCase()
    return plan === 'pro' || plan === 'premium'
  },
  scrapeSettingsComponent: LinkedInScrapeSettings,
  commentSettingsComponent: LinkedInCommentSettings,
  queueColumns: getPostColumns('pending'),
  queueItemComponent: PlaceholderQueueItem,
}
