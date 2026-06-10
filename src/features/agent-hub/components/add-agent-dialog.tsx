import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { IconBrandLinkedin, IconBrandX, IconPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  getAgentType,
  getAgentTypeFor,
} from '@/features/agent-system/registry'
import {
  PlatformCapabilityPicker,
  type PlatformCapabilitySelection,
} from '@/features/agent-system/components/platform-capability-picker'
import type { Platform } from '@/features/agent-system/types/agent.types'
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
  initialAgentSlug?: string
}

const PLATFORM_CONFIG = {
  linkedin: {
    connectingLabel: 'Connecting LinkedIn...',
    icon: IconBrandLinkedin,
  },
  twitter: {
    connectingLabel: 'Connecting X...',
    icon: IconBrandX,
  },
} as const

type Step = 'select' | 'connect'

const emptySelection: PlatformCapabilitySelection = {
  platform: null,
  capabilities: [],
  commentGoal: 'branding',
}

export function AddAgentDialog({
  open,
  onOpenChange,
  initialAgentSlug,
}: AddAgentDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [selection, setSelection] = useState<PlatformCapabilitySelection>(emptySelection)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const { data: user } = useGetUserQuery()
  const { data: profiles } = useGetAllProfileQuery()
  const navigate = useNavigate()

  const { linkProfile, isLinkingProfile } = useLinkProfile(false)
  const { linkTwitterProfile, isLinkingTwitterProfile } = useLinkTwitterProfile(false)
  const activateAgentType = useActivateAgentType()
  const [isLinking, setIsLinking] = useState(false)

  useEffect(() => {
    if (!open || !initialAgentSlug) return
    const preset = getAgentType(initialAgentSlug)
    if (preset) {
      setSelection({
        platform: preset.platform,
        capabilities: [preset.capability],
        commentGoal: 'branding',
      })
      setStep('connect')
    }
  }, [open, initialAgentSlug])

  const isConnecting = isLinking || isLinkingProfile || isLinkingTwitterProfile

  const platform: Platform = selection.platform ?? 'linkedin'
  const config = PLATFORM_CONFIG[platform]
  const PlatformIcon = config.icon

  const selectedSlugs = selection.platform
    ? selection.capabilities
        .map((c) => getAgentTypeFor(platform, c)?.slug)
        .filter((s): s is string => Boolean(s))
    : []

  const primarySlug = selection.capabilities.includes('comment')
    ? getAgentTypeFor(platform, 'comment')?.slug
    : getAgentTypeFor(platform, 'post')?.slug

  const existingProfiles = (profiles ?? []).filter((p) =>
    platform === 'twitter' ? p.platform === 'twitter' : p.platform !== 'twitter'
  )

  const resetAndClose = () => {
    onOpenChange(false)
    setStep('select')
    setSelection(emptySelection)
    setSelectedProfileId(null)
  }

  const defaultTabForAgent = (slug?: string) =>
    slug === 'linkedin-posting' ? 'calendar' : 'settings'

  const activateAllAndNavigate = async (profileId: string) => {
    for (const slug of selectedSlugs) {
      await activateAgentType.mutateAsync({ profileId, agentType: slug })
    }
    resetAndClose()
    if (primarySlug) {
      navigate({
        to: `/agents/$profileId/$agentType/${defaultTabForAgent(primarySlug)}` as string,
        params: { profileId, agentType: primarySlug },
      })
    }
  }

  const handleConnectNew = async () => {
    if (!selectedSlugs.length) return
    setIsLinking(true)
    try {
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
      if (profileId) await activateAllAndNavigate(profileId)
    } catch (error) {
      console.error('Error connecting profile:', error)
    } finally {
      setIsLinking(false)
    }
  }

  const goToBilling = () => {
    resetAndClose()
    navigate({ to: '/billing' })
  }

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
                Pick a platform and what you want the agent to do.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <PlatformCapabilityPicker
                value={selection}
                onChange={setSelection}
                user={user}
                onUpgrade={goToBilling}
              />
            </div>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                disabled={!selectedSlugs.length}
                onClick={() => setStep('connect')}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'connect' && selectedSlugs.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>Choose Account</DialogTitle>
              <DialogDescription>
                Select an existing {platform === 'twitter' ? 'X' : 'LinkedIn'} account or
                connect a new one.
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
                  handleConnectNew()
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
                  onClick={() => activateAllAndNavigate(selectedProfileId)}
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
