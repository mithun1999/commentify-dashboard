import { IconPlus } from '@tabler/icons-react'
import { Card, CardContent } from '@/components/ui/card'

interface AddAgentCardProps {
  onClick: () => void
}

export function AddAgentCard({ onClick }: AddAgentCardProps) {
  return (
    <Card
      className='border-dashed cursor-pointer transition-colors hover:border-solid hover:shadow-md'
      onClick={onClick}
    >
      <CardContent className='flex h-full min-h-[120px] flex-col items-center justify-center gap-2 pt-6'>
        <div className='bg-muted flex size-10 items-center justify-center rounded-lg'>
          <IconPlus className='size-5' />
        </div>
        <p className='text-muted-foreground text-sm font-medium'>Add Agent</p>
      </CardContent>
    </Card>
  )
}
