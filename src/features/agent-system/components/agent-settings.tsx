import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentAgent } from '../hooks/use-current-agent'

export function AgentSettings() {
  const { agent, agentTypeDef } = useCurrentAgent()
  const [tab, setTab] = useState('scrape')

  if (!agent || !agentTypeDef) return null

  const ScrapeComponent = agentTypeDef.scrapeSettingsComponent
  const CommentComponent = agentTypeDef.commentSettingsComponent

  return (
    <div>
      <h2 className='mb-4 text-lg font-semibold'>Settings</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='scrape'>Scrape Settings</TabsTrigger>
          <TabsTrigger value='comment'>Comment Settings</TabsTrigger>
        </TabsList>
        <TabsContent value='scrape' className='mt-4'>
          <ScrapeComponent profileId={agent.profileId} />
        </TabsContent>
        <TabsContent value='comment' className='mt-4'>
          <CommentComponent profileId={agent.profileId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
