'use client'

import { Lock, Megaphone, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IUser } from '@/features/auth/interface/user.interface'
import {
  getAgentTypeFor,
  getPlatforms,
  type PlatformCapabilityOption,
} from '../registry'
import type { AgentCapability, Platform } from '../types/agent.types'

export type CommentGoal = 'branding' | 'sales'

export interface PlatformCapabilitySelection {
  platform: Platform | null
  capabilities: AgentCapability[]
  commentGoal: CommentGoal
}

interface PlatformCapabilityPickerProps {
  value: PlatformCapabilitySelection
  onChange: (next: PlatformCapabilitySelection) => void
  user?: IUser
  /** Show the branding/sales goal selector when commenting is chosen. */
  showCommentGoal?: boolean
  onUpgrade?: () => void
}

const GOALS: { value: CommentGoal; label: string; description: string; icon: typeof Megaphone }[] = [
  {
    value: 'branding',
    label: 'Personal Branding',
    description: 'Grow your network by commenting on relevant posts.',
    icon: Megaphone,
  },
  {
    value: 'sales',
    label: 'Sales',
    description: 'Find high-intent posts and pitch your product naturally.',
    icon: Target,
  },
]

export function PlatformCapabilityPicker({
  value,
  onChange,
  user,
  showCommentGoal = false,
  onUpgrade,
}: PlatformCapabilityPickerProps) {
  const platforms = getPlatforms()

  const isCapabilityEligible = (
    platform: Platform,
    capability: AgentCapability
  ): boolean => {
    const agentType = getAgentTypeFor(platform, capability)
    if (!agentType) return false
    if (agentType.access === 'open') return true
    if (!user || !agentType.isEligible) return false
    return agentType.isEligible(user)
  }

  const selectPlatform = (platform: Platform) => {
    if (value.platform === platform) return
    onChange({ ...value, platform, capabilities: [] })
  }

  const toggleCapability = (capability: AgentCapability) => {
    const has = value.capabilities.includes(capability)
    const capabilities = has
      ? value.capabilities.filter((c) => c !== capability)
      : [...value.capabilities, capability]
    onChange({ ...value, capabilities })
  }

  const activePlatform = platforms.find((p) => p.id === value.platform)
  const showGoal =
    showCommentGoal &&
    value.platform === 'linkedin' &&
    value.capabilities.includes('comment')

  return (
    <div className='space-y-6'>
      <div>
        <p className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
          Platform
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          {platforms.map((platform) => {
            const Icon = platform.icon
            const isSelected = value.platform === platform.id
            return (
              <button
                key={platform.id}
                type='button'
                onClick={() => selectPlatform(platform.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                  isSelected
                    ? 'ring-primary border-primary bg-primary/5 ring-2'
                    : 'hover:bg-muted/50 cursor-pointer'
                )}
              >
                <div
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                    isSelected ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <Icon className='size-6' />
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold'>{platform.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {platform.capabilities
                      .map((c) => c.label)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {activePlatform && (
        <div>
          <p className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
            What should it do? <span className='normal-case'>(pick one or more)</span>
          </p>
          <div className='grid gap-2'>
            {activePlatform.capabilities.map((cap) =>
              renderCapability(cap)
            )}
          </div>
        </div>
      )}

      {showGoal && (
        <div>
          <p className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
            Commenting goal
          </p>
          <div className='grid gap-2'>
            {GOALS.map((goal) => {
              const GoalIcon = goal.icon
              const isSelected = value.commentGoal === goal.value
              return (
                <button
                  key={goal.value}
                  type='button'
                  onClick={() => onChange({ ...value, commentGoal: goal.value })}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                    isSelected
                      ? 'ring-primary border-primary bg-primary/5 ring-1'
                      : 'hover:bg-muted/50 border-border'
                  )}
                >
                  <GoalIcon
                    className={cn(
                      'size-4 shrink-0',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected && 'text-primary'
                      )}
                    >
                      {goal.label}
                    </span>
                    <p className='text-muted-foreground text-xs'>
                      {goal.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  function renderCapability(cap: PlatformCapabilityOption) {
    const platform = value.platform as Platform
    const comingSoon = cap.status === 'coming-soon'
    const eligible = !comingSoon && isCapabilityEligible(platform, cap.capability)
    const isSelected = value.capabilities.includes(cap.capability)
    const disabled = comingSoon || !eligible

    return (
      <div
        key={cap.capability}
        className={cn(
          'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all',
          isSelected && 'ring-primary border-primary bg-primary/5 ring-1',
          disabled ? 'opacity-70' : 'hover:bg-muted/50 cursor-pointer'
        )}
        role='button'
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && toggleCapability(cap.capability)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleCapability(cap.capability)
          }
        }}
      >
        <div
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded border',
            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
            disabled && 'opacity-50'
          )}
        >
          {isSelected && <span className='text-[10px] leading-none'>✓</span>}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>{cap.label}</span>
            {comingSoon && (
              <Badge variant='secondary' className='text-[10px]'>
                Coming soon
              </Badge>
            )}
            {!comingSoon && !eligible && (
              <span className='text-muted-foreground inline-flex items-center gap-1 text-xs'>
                <Lock className='size-3' /> Invite only
              </span>
            )}
          </div>
        </div>
        {!comingSoon && !eligible && onUpgrade && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              onUpgrade()
            }}
          >
            Upgrade
          </Button>
        )}
      </div>
    )
  }
}
