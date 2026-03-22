import { IconBrandX } from '@tabler/icons-react'
import { AGENT_TYPES } from '@/features/agent-system/registry'
import { getTwitterQueueColumns } from './components/queue-columns'
import { TwitterScrapeSettings } from './components/scrape-settings-form'
import { TwitterCommentSettings } from './components/comment-settings-form'

const PlaceholderQueueItem = () => null

AGENT_TYPES['twitter-commenting'] = {
  slug: 'twitter-commenting',
  name: 'Twitter Commenting',
  description:
    'Automatically find and reply to relevant tweets to build your presence on X.',
  icon: IconBrandX,
  platform: 'twitter',
  access: 'open',
  scrapeSettingsComponent: TwitterScrapeSettings,
  commentSettingsComponent: TwitterCommentSettings,
  queueColumns: getTwitterQueueColumns('pending'),
  queueItemComponent: PlaceholderQueueItem,
}
