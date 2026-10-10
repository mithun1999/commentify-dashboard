import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ClientBadge } from './client-badge'

interface ClientCardProps {
  name: string
  tagline: string
  /** The fastest way in: a one-click button where the app allows it. */
  action: ReactNode
  steps: ReactNode[]
  note?: ReactNode
}

export function ClientCard({
  name,
  tagline,
  action,
  steps,
  note,
}: ClientCardProps) {
  return (
    <Card className='flex flex-col gap-0 py-0'>
      <CardContent className='flex flex-1 flex-col gap-4 p-5'>
        <div className='flex items-center gap-3'>
          <ClientBadge name={name} />
          <div className='min-w-0'>
            <p className='leading-tight font-semibold'>{name}</p>
            <p className='text-muted-foreground text-sm'>{tagline}</p>
          </div>
        </div>
        <div>{action}</div>
        <ol className='text-muted-foreground list-decimal space-y-1 pl-5 text-sm'>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        {note && (
          <p className='text-muted-foreground mt-auto text-xs'>{note}</p>
        )}
      </CardContent>
    </Card>
  )
}
