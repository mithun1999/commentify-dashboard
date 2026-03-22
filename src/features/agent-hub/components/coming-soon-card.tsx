import { type ComponentType } from 'react'
import {
  IconBrandReddit,
  IconBrandLinkedin,
  IconBrandX,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface UpcomingAgent {
  name: string
  icon: ComponentType<{ className?: string }>
}

const UPCOMING_AGENTS: UpcomingAgent[] = [
  { name: 'Reddit Commenting', icon: IconBrandReddit },
  { name: 'LinkedIn Posting', icon: IconBrandLinkedin },
  { name: 'X Posting', icon: IconBrandX },
]

export function ComingSoonCards() {
  return (
    <>
      {UPCOMING_AGENTS.map((agent) => (
        <ComingSoonCard key={agent.name} agent={agent} />
      ))}
    </>
  )
}

function ComingSoonCard({ agent }: { agent: UpcomingAgent }) {
  const Icon = agent.icon

  return (
    <Card className='border-dashed opacity-50'>
      <CardHeader className='flex flex-row items-start gap-2 pb-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-muted flex size-10 items-center justify-center rounded-lg'>
            <Icon className='size-5' />
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-semibold leading-tight'>{agent.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <Badge variant='outline' className='text-xs'>
          Coming Soon
        </Badge>
      </CardContent>
    </Card>
  )
}
