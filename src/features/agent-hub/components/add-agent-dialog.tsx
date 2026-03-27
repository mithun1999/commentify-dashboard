import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { IconBrandLinkedin, IconBrandX } from '@tabler/icons-react'
import { toast } from 'sonner'
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
import {
  useLinkProfile,
  useLinkTwitterProfile,
} from '@/features/users/query/profile.query'
import { getTwitterProfileDetailsFromExtension } from '@/features/twitter-commenting/utils/extension'

interface AddAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PLATFORM_CONFIG = {
  linkedin: {
    buttonLabel: 'Connect LinkedIn',
    connectingLabel: 'Connecting LinkedIn...',
    icon: IconBrandLinkedin,
  },
  twitter: {
    buttonLabel: 'Connect X',
    connectingLabel: 'Connecting X...',
    icon: IconBrandX,
  },
} as const

type Step = 'select' | 'connect'

export function AddAgentDialog({ open, onOpenChange }: AddAgentDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<AgentTypeDefinition | null>(null)
  const { data: user } = useGetUserQuery()
  const navigate = useNavigate()
  const agentTypes = getAllAgentTypes()

  const { linkProfile, isLinkingProfile } = useLinkProfile(false)
  const { linkTwitterProfile, isLinkingTwitterProfile } = useLinkTwitterProfile(false)
  const [isLinking, setIsLinking] = useState(false)

  const isConnecting = isLinking || isLinkingProfile || isLinkingTwitterProfile

  const resetAndClose = () => {
    onOpenChange(false)
    setStep('select')
    setSelected(null)
  }

  const handleConnect = async () => {
    if (!selected) return
    setIsLinking(true)

    try {
      const platform = selected.platform
      let profileId: string | undefined

      if (platform === 'twitter') {
        const details = await getTwitterProfileDetailsFromExtension()
        if (!details?.authToken) {
          toast.error('Please log in to X.com first, then try again.')
          window.open('https://x.com', '_blank')
          return
        }
        const result = await linkTwitterProfile(details)
        profileId = result?.profile?._id
      } else {
        const result = await linkProfile()
        profileId = result?.profile?._id
      }

      if (profileId) {
        resetAndClose()
        navigate({
          to: '/agents/$profileId/$agentType/settings',
          params: { profileId, agentType: selected.slug },
        })
      }
    } catch (error) {
      console.error('Error connecting profile:', error)
    } finally {
      setIsLinking(false)
    }
  }

  const isEligible = (type: AgentTypeDefinition) => {
    if (type.access === 'open') return true
    if (!user || !type.isEligible) return false
    return type.isEligible(user)
  }

  const platform = selected?.platform ?? 'linkedin'
  const config = PLATFORM_CONFIG[platform]
  const PlatformIcon = config.icon

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetAndClose()
        else onOpenChange(value)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        {step === 'select' && (
          <>
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
                        <span className='text-sm font-semibold'>
                          {type.name}
                        </span>
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
              <Button variant='outline' onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                disabled={!selected}
                onClick={() => setStep('connect')}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'connect' && selected && (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your Account</DialogTitle>
              <DialogDescription>
                Link your {platform === 'twitter' ? 'X' : 'LinkedIn'} account
                to start using this agent.
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col items-center gap-4 py-6'>
              <div className='bg-muted flex size-16 items-center justify-center rounded-full'>
                <PlatformIcon className='size-8' />
              </div>
              <p className='text-muted-foreground text-center text-sm'>
                Make sure you're logged in to{' '}
                {platform === 'twitter' ? 'X.com' : 'LinkedIn'} and have the
                Commentify extension installed.
              </p>
              <Button
                className='w-full max-w-xs'
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {config.connectingLabel}
                  </>
                ) : (
                  <>
                    <PlatformIcon className='mr-2 h-4 w-4' />
                    {config.buttonLabel}
                  </>
                )}
              </Button>
            </div>
            <div className='flex justify-start'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setStep('select')}
                disabled={isConnecting}
              >
                Back
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
