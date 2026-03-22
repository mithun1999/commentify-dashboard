import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getAllAgentTypes } from '@/features/agent-system/registry'
import type { AgentTypeDefinition } from '@/features/agent-system/types/agent.types'
import { useGetUserQuery } from '@/features/auth/query/user.query'

interface AddAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAgentDialog({ open, onOpenChange }: AddAgentDialogProps) {
  const [selected, setSelected] = useState<AgentTypeDefinition | null>(null)
  const { data: user } = useGetUserQuery()
  const agentTypes = getAllAgentTypes()

  const handleContinue = () => {
    if (!selected) return
    // TODO: trigger platform-specific connect flow, then navigate to agent settings
    onOpenChange(false)
    setSelected(null)
  }

  const isEligible = (type: AgentTypeDefinition) => {
    if (type.access === 'open') return true
    if (!user || !type.isEligible) return false
    return type.isEligible(user)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add Agent</DialogTitle>
          <DialogDescription>
            Choose an agent type to get started.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3 py-4'>
          {agentTypes.map((type) => {
            const eligible = isEligible(type)
            const Icon = type.icon
            const isSelected = selected?.slug === type.slug

            return (
              <button
                key={type.slug}
                type='button'
                disabled={!eligible}
                onClick={() => setSelected(type)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  isSelected && 'ring-primary border-primary ring-1',
                  eligible
                    ? 'hover:bg-muted cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                )}
              >
                <div className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg'>
                  <Icon className='size-5' />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-semibold'>{type.name}</span>
                    {type.badge && (
                      <Badge variant='secondary' className='text-xs'>
                        {type.badge}
                      </Badge>
                    )}
                  </div>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {type.description}
                  </p>
                  {!eligible && (
                    <p className='mt-1 text-xs text-amber-600'>
                      Available by invitation for paid customers.
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
