'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Info, PlusCircle, UserSearch, X } from 'lucide-react'
import { planSetting } from '@/config/plan-setting.config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { useUpdateMonitoredProfilesQuery } from '@/features/settings/query/setting.query'
import { UnlockWrapper } from '@/features/settings/components/UnlockWrapper'

function normalizeLinkedInUrl(input: string): string | null {
  let url = input.trim()
  if (!url) return null

  if (!url.startsWith('http')) {
    url = 'https://' + url
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')
    if (hostname !== 'linkedin.com') return null

    const match = parsed.pathname.match(/^\/in\/([a-zA-Z0-9_-]+)/)
    if (!match) return null

    return `https://www.linkedin.com/in/${match[1]}`
  } catch {
    return null
  }
}

export interface MonitoredProfilesHandle {
  save: () => void
}

export const MonitoredProfiles = forwardRef<
  MonitoredProfilesHandle,
  { profileId: string }
>(function MonitoredProfiles({ profileId }, ref) {
  const { data: user } = useGetUserQuery()
  const { data: profiles } = useGetAllProfileQuery()
  const { updateMonitoredProfiles } = useUpdateMonitoredProfilesQuery()

  const basePlanName = user?.subscribedProduct?.sku
    ?.split('_')[0]
    ?.toLowerCase()
  const userPlan = (basePlanName as 'starter' | 'pro' | 'premium') ?? 'starter'

  const limit = (planSetting['monitoredProfiles']?.[userPlan] as number) ?? 0
  const isUnlocked = limit > 0

  const profile = profiles?.find((p) => p._id === profileId)
  const savedProfiles = profile?.setting?.monitoredProfiles ?? []

  const [profileUrls, setProfileUrls] = useState<string[]>(savedProfiles)
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  useEffect(() => {
    setProfileUrls(savedProfiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.setting?.monitoredProfiles?.length])

  useImperativeHandle(ref, () => ({
    save: () => {
      const isDirty =
        JSON.stringify(profileUrls) !== JSON.stringify(savedProfiles)
      if (isDirty) {
        updateMonitoredProfiles({ profileId, monitoredProfiles: profileUrls })
      }
    },
  }))

  const handleAdd = () => {
    setInputError('')
    const normalized = normalizeLinkedInUrl(inputValue)

    if (!normalized) {
      setInputError('Enter a valid LinkedIn profile URL (linkedin.com/in/...)')
      return
    }

    if (profileUrls.includes(normalized)) {
      setInputError('This profile is already in the list')
      return
    }

    if (profileUrls.length >= limit) {
      setInputError(`You can monitor up to ${limit} profiles on your plan`)
      return
    }

    setProfileUrls([...profileUrls, normalized])
    setInputValue('')
  }

  const handleRemove = (url: string) => {
    setProfileUrls(profileUrls.filter((u) => u !== url))
  }

  const extractDisplayName = (url: string) => {
    try {
      const match = url.match(/\/in\/([a-zA-Z0-9_-]+)/)
      return match ? match[1] : url
    } catch {
      return url
    }
  }

  const content = (
    <div className='mb-8 space-y-3'>
      <div className='flex items-center gap-x-6'>
        <div className='flex items-center gap-2'>
          <UserSearch className='text-muted-foreground h-4 w-4' />
          <Label className='text-foreground font-semibold'>
            Monitored Profiles
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                  <Info className='text-muted-foreground h-3 w-3' />
                </div>
              </TooltipTrigger>
              <TooltipContent side='right' className='max-w-xs'>
                <p>
                  Add LinkedIn profiles to automatically check their posts daily
                  and comment on them
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isUnlocked && (
          <p className='text-muted-foreground text-sm'>
            {profileUrls.length}/{limit} profiles
          </p>
        )}
      </div>

      {isUnlocked && (
        <>
          <div className='flex flex-wrap gap-2'>
            {profileUrls.map((url) => (
              <span
                key={url}
                className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
              >
                {extractDisplayName(url)}
                <button
                  type='button'
                  onClick={() => handleRemove(url)}
                  className='hover:text-primary/70 transition'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </span>
            ))}

            {profileUrls.length < limit && (
              <div className='flex items-center gap-1'>
                <Input
                  placeholder='linkedin.com/in/username'
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setInputError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdd()
                    }
                  }}
                  className='h-9 w-64'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleAdd}
                  disabled={!inputValue.trim()}
                >
                  <PlusCircle className='h-4 w-4' />
                </Button>
              </div>
            )}
          </div>

          {inputError && (
            <p className='text-destructive text-sm'>{inputError}</p>
          )}
        </>
      )}
    </div>
  )

  return <UnlockWrapper isUnlocked={isUnlocked}>{content}</UnlockWrapper>
})
