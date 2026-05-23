import { type ComponentType } from 'react'
import {
  IconArrowRight,
  IconBrandReddit,
  IconBrandX,
  IconCalendarEvent,
  IconSparkles,
  IconWand,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface UpcomingAgent {
  name: string
  icon: ComponentType<{ className?: string }>
}

const UPCOMING_AGENTS: UpcomingAgent[] = [
  { name: 'Reddit Commenting', icon: IconBrandReddit },
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

interface BetaAgentCardProps {
  name: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}

const LINKEDIN_POSTING_HIGHLIGHTS: {
  icon: ComponentType<{ className?: string }>
  label: string
}[] = [
  { icon: IconSparkles, label: 'Posts written in your voice' },
  { icon: IconCalendarEvent, label: 'A full week, auto-scheduled' },
  { icon: IconWand, label: 'Realistic images generated for you' },
]

export function BetaAgentCard({ name, icon: Icon, onClick }: BetaAgentCardProps) {
  return (
    <Card
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group relative cursor-pointer overflow-hidden transition-all',
        'border-primary/30 from-primary/5 to-background bg-gradient-to-br via-transparent',
        'hover:border-primary hover:shadow-md',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      <CardHeader className='flex flex-row items-start justify-between gap-2 pb-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
            <Icon className='size-5' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-semibold leading-tight'>{name}</p>
              <Badge
                variant='secondary'
                className='bg-primary/10 text-primary border-primary/20 text-[10px]'
              >
                New · Beta
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1 text-xs leading-snug'>
              Let an AI agent plan, write, and schedule your LinkedIn posts —
              in your voice.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <ul className='mb-3 space-y-1.5'>
          {LINKEDIN_POSTING_HIGHLIGHTS.map(({ icon: HighlightIcon, label }) => (
            <li
              key={label}
              className='text-muted-foreground flex items-center gap-2 text-xs'
            >
              <HighlightIcon className='text-primary size-3.5 shrink-0' />
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <Button
          size='sm'
          className='w-full'
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          Try it free
          <IconArrowRight className='ml-1 size-3.5 transition-transform group-hover:translate-x-0.5' />
        </Button>
      </CardContent>
    </Card>
  )
}
