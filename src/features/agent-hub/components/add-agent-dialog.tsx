import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { IconBrandLinkedin, IconBrandX, IconPlus } from '@tabler/icons-react'
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
  useGetAllProfileQuery,
  useLinkProfile,
  useLinkTwitterProfile,
} from '@/features/users/query/profile.query'
import { useActivateAgentType } from '@/features/post-generator/query/post-generator.query'
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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const { data: user } = useGetUserQuery()
  const { data: profiles } = useGetAllProfileQuery()
  const navigate = useNavigate()
  const agentTypes = getAllAgentTypes()

  const { linkProfile, isLinkingProfile } = useLinkProfile(false)
  const { linkTwitterProfile, isLinkingTwitterProfile } = useLinkTwitterProfile(false)
  const activateAgentType = useActivateAgentType()
  const [isLinking, setIsLinking] = useState(false)

  const isConnecting = isLinking || isLinkingProfile || isLinkingTwitterProfile

  const existingProfiles = (profiles ?? []).filter(
    (p) => (selected?.platform === 'twitter' ? p.platform === 'twitter' : p.platform !== 'twitter')
  )

  const resetAndClose = () => {
    onOpenChange(false)
    setStep('select')
    setSelected(null)
    setSelectedProfileId(null)
  }

  const defaultTabForAgent = (slug: string) =>
    slug === 'linkedin-posting' ? 'calendar' : 'settings'

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
        await activateAgentType.mutateAsync({
          profileId,
          agentType: selected.slug,
        })
        resetAndClose()
        navigate({
          to: `/agents/$profileId/$agentType/${defaultTabForAgent(selected.slug)}` as string,
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
              <DialogTitle>Choose Account</DialogTitle>
              <DialogDescription>
                Select an existing {platform === 'twitter' ? 'X' : 'LinkedIn'} account or connect a new one.
              </DialogDescription>
            </DialogHeader>
            <div className='grid max-h-[50vh] gap-2 overflow-y-auto py-4'>
              {existingProfiles.map((profile) => {
                const isSelected = selectedProfileId === profile._id
                const displayName =
                  platform === 'twitter' && profile.screenName
                    ? `@${profile.screenName}`
                    : `${profile.firstName} ${profile.lastName}`

                return (
                  <button
                    key={profile._id}
                    type='button'
                    onClick={() => setSelectedProfileId(profile._id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      isSelected && 'ring-primary border-primary ring-1',
                      'hover:bg-muted cursor-pointer'
                    )}
                  >
                    <div className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-full'>
                      <PlatformIcon className='size-4' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium'>{displayName}</p>
                      {profile.publicIdentifier && (
                        <p className='text-muted-foreground truncate text-xs'>
                          {profile.publicIdentifier}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className='bg-primary size-2 shrink-0 rounded-full' />
                    )}
                  </button>
                )
              })}
              <button
                type='button'
                onClick={() => {
                  setSelectedProfileId(null)
                  handleConnect()
                }}
                disabled={isConnecting}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors',
                  'hover:bg-muted cursor-pointer',
                  isConnecting && 'cursor-not-allowed opacity-60'
                )}
              >
                <div className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-full'>
                  {isConnecting ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <IconPlus className='size-4' />
                  )}
                </div>
                <p className='text-sm font-medium'>
                  {isConnecting
                    ? config.connectingLabel
                    : `Connect new ${platform === 'twitter' ? 'X' : 'LinkedIn'} account`}
                </p>
              </button>
            </div>
            <div className='flex justify-between'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setStep('select')
                  setSelectedProfileId(null)
                }}
                disabled={isConnecting}
              >
                Back
              </Button>
              {selectedProfileId && (
                <Button
                  disabled={activateAgentType.isPending}
                  onClick={async () => {
                    await activateAgentType.mutateAsync({
                      profileId: selectedProfileId,
                      agentType: selected.slug,
                    })
                    resetAndClose()
                    navigate({
                      to: `/agents/$profileId/$agentType/${defaultTabForAgent(selected.slug)}` as string,
                      params: { profileId: selectedProfileId, agentType: selected.slug },
                    })
                  }}
                >
                  {activateAgentType.isPending ? (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  ) : null}
                  Continue
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
