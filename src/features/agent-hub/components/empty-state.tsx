import { IconRobot } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddAgent: () => void
}

export function EmptyState({ onAddAgent }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center py-20'>
      <div className='bg-muted flex size-16 items-center justify-center rounded-2xl'>
        <IconRobot className='size-8' />
      </div>
      <h2 className='mt-6 text-xl font-semibold'>No agents yet</h2>
      <p className='text-muted-foreground mt-2 max-w-sm text-center text-sm'>
        Agents automatically find and comment on posts that match your
        keywords. Add your first agent to get started.
      </p>
      <Button className='mt-6' onClick={onAddAgent}>
        Add your first agent
      </Button>
    </div>
  )
}
