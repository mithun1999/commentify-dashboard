'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  HandshakeIcon,
  Megaphone,
  Target,
  Filter,
  Users,
  Swords,
  Smile,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  X,
  Info,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import {
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { useCreateOnboardingCommentQuery } from '@/features/onboarding/query/onboarding.query'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { OnboardingNavigation } from '@/features/onboarding/onboarding-navigation'
import { useCreateSalesSetting } from '../query/sales.query'
import type { CommentLengthEnum } from '@/features/settings/enum/setting.enum'

const PITCH_OPTIONS = [
  {
    value: 'subtle' as const,
    label: 'Subtle',
    description: 'Add value first, mention product only when naturally relevant',
    icon: HandshakeIcon,
  },
  {
    value: 'moderate' as const,
    label: 'Moderate',
    description: 'Weave product mentions into helpful commentary',
    icon: Megaphone,
  },
  {
    value: 'direct' as const,
    label: 'Direct',
    description: "Lead with how your product solves the post's problem",
    icon: Target,
  },
]

const salesStrategySchema = z.object({
  pitchIntensity: z.enum(['subtle', 'moderate', 'direct']),
  matchMode: z.enum(['strict', 'flexible']),
  suggestedJobTitles: z.array(z.string()).max(6),
  competitorNames: z.array(z.string()),
  useEmojis: z.boolean(),
  useExclamations: z.boolean(),
  commentLength: z.enum(['short', 'medium', 'long']),
  commentsPerDay: z.number().min(1).max(100),
})

type SalesStrategyValues = z.infer<typeof salesStrategySchema>

export function SalesStrategyStep() {
  const posthog = usePostHog()
  const { data: onboardingData, markStepCompleted } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id

  const { createSalesSettingAsync, isCreatingSalesSetting } =
    useCreateSalesSetting()
  const {
    createOnboardingCommentSettingAsync,
    isCreatingOnboardingComment,
  } = useCreateOnboardingCommentQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const [jobTitleInput, setJobTitleInput] = useState('')
  const [competitorInput, setCompetitorInput] = useState('')
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false)
  const [isCommentStyleExpanded, setIsCommentStyleExpanded] = useState(false)

  const form = useForm<SalesStrategyValues>({
    resolver: zodResolver(salesStrategySchema),
    defaultValues: {
      pitchIntensity: onboardingData.salesSetting.pitchIntensity,
      matchMode: onboardingData.salesSetting.matchMode,
      suggestedJobTitles: onboardingData.salesSetting.suggestedJobTitles,
      competitorNames: onboardingData.salesSetting.competitorNames,
      useEmojis: true,
      useExclamations: true,
      commentLength: 'medium',
      commentsPerDay: 10,
    },
  })

  const { watch, setValue } = form
  const pitchIntensity = watch('pitchIntensity')
  const matchMode = watch('matchMode')
  const suggestedJobTitles = watch('suggestedJobTitles')
  const competitorNames = watch('competitorNames')

  const isLoading =
    isCreatingSalesSetting ||
    isCreatingOnboardingComment ||
    isUpdatingOnboardingStatus

  const addJobTitle = (value: string) => {
    const trimmed = value.trim()
    if (
      trimmed &&
      !suggestedJobTitles.includes(trimmed) &&
      suggestedJobTitles.length < 6
    ) {
      setValue('suggestedJobTitles', [...suggestedJobTitles, trimmed])
    }
    setJobTitleInput('')
  }

  const addCompetitor = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !competitorNames.includes(trimmed)) {
      setValue('competitorNames', [...competitorNames, trimmed])
    }
    setCompetitorInput('')
  }

  const handleSubmit = async (): Promise<boolean> => {
    const isValid = await form.trigger()
    if (!isValid) return false

    if (!resolvedProfileId) {
      toast.error(
        'No connected profile found. Please go back and connect your account first.'
      )
      return false
    }

    const values = form.getValues()
    const { salesSetting } = onboardingData

    try {
      // Step 1: Save sales settings (creates Setting with scrapeSetting)
      await createSalesSettingAsync({
        profileId: resolvedProfileId,
        data: {
          websiteUrl: salesSetting.websiteUrl,
          productDescription: salesSetting.productDescription,
          painPoints: salesSetting.painPoints,
          valuePropositions: salesSetting.valuePropositions,
          pitchIntensity: values.pitchIntensity,
          matchMode: values.matchMode,
          competitorNames: values.competitorNames,
          suggestedJobTitles: values.suggestedJobTitles,
        },
      })

      // Step 2: Save comment settings + activate the scrape job
      await createOnboardingCommentSettingAsync({
        profileId: resolvedProfileId,
        data: {
          aboutProfile: salesSetting.productDescription,
          length: values.commentLength as CommentLengthEnum,
          commentsPerDay: values.commentsPerDay,
          turnOnEmoji: values.useEmojis,
          turnOnExclamations: values.useExclamations,
        },
      })

      posthog?.capture('onboarding_sales_strategy_completed', {
        pitchIntensity: values.pitchIntensity,
        matchMode: values.matchMode,
        jobTitlesCount: values.suggestedJobTitles.length,
        competitorsCount: values.competitorNames.length,
      })

      markStepCompleted('comment-settings')
      await updateOnboardingStatusAsync({
        status: 'in-progress',
        step: 5,
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <Form {...form}>
      <form>
        <OnboardingCard
          title='Configure your sales strategy'
          description='Set how aggressively your agent pitches and who it targets.'
        >
          <div className='space-y-6'>
            {/* Pitch Intensity */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Target className='text-muted-foreground h-4 w-4' />
                <Label className='text-foreground font-medium'>
                  Pitch Intensity
                </Label>
              </div>
              <div className='grid gap-2'>
                {PITCH_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = pitchIntensity === option.value
                  return (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() =>
                        setValue('pitchIntensity', option.value)
                      }
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                        isSelected
                          ? 'ring-primary border-primary bg-primary/5 ring-1'
                          : 'hover:bg-muted/50 border-border'
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-5 shrink-0',
                          isSelected
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      />
                      <div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isSelected && 'text-primary'
                          )}
                        >
                          {option.label}
                        </span>
                        <p className='text-muted-foreground text-xs'>
                          {option.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Match Mode */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Filter className='text-muted-foreground h-4 w-4' />
                <Label className='text-foreground font-medium'>
                  Match Strictness
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
                        Strict: Only engage with highly relevant posts
                        <br />
                        Flexible: Also engage with moderately related
                        discussions
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {(['strict', 'flexible'] as const).map((mode) => (
                  <button
                    key={mode}
                    type='button'
                    onClick={() => setValue('matchMode', mode)}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-left transition-all',
                      matchMode === mode
                        ? 'ring-primary border-primary bg-primary/5 ring-1'
                        : 'hover:bg-muted/50 border-border'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium capitalize',
                        matchMode === mode && 'text-primary'
                      )}
                    >
                      {mode}
                    </span>
                    <p className='text-muted-foreground text-xs'>
                      {mode === 'strict'
                        ? 'High relevance posts only'
                        : 'Broader reach, more conversations'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Job Titles */}
            <div className='space-y-2'>
              <div className='flex items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <Users className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground font-medium'>
                    Target Job Titles
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
                          Job titles of your ideal customers.
                          <br />
                          We'll prioritize posts from these people.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className='text-muted-foreground text-sm'>
                  {suggestedJobTitles.length}/6
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {suggestedJobTitles.map((title) => (
                  <span
                    key={title}
                    className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                  >
                    {title}
                    <button
                      type='button'
                      onClick={() =>
                        setValue(
                          'suggestedJobTitles',
                          suggestedJobTitles.filter((t) => t !== title)
                        )
                      }
                      className='hover:text-primary/70 transition'
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  </span>
                ))}
                {suggestedJobTitles.length < 6 && (
                  <div className='flex items-center gap-1'>
                    <Input
                      placeholder='e.g. CTO, VP Engineering...'
                      value={jobTitleInput}
                      onChange={(e) => setJobTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addJobTitle(jobTitleInput)
                        }
                      }}
                      className='h-9 w-48'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => addJobTitle(jobTitleInput)}
                      disabled={!jobTitleInput.trim()}
                    >
                      <PlusCircle className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced: Competitors - Collapsible */}
            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              >
                <div className='flex items-center gap-2'>
                  <Swords className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Competitors
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
                          Name competitors so the agent can engage
                          <br />
                          in comparison discussions intelligently
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground transition-colors'>
                  {isAdvancedExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>
              {isAdvancedExpanded && (
                <div className='flex flex-wrap gap-2 pt-2'>
                  {competitorNames.map((name) => (
                    <span
                      key={name}
                      className='bg-card border-border text-card-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                    >
                      {name}
                      <button
                        type='button'
                        onClick={() =>
                          setValue(
                            'competitorNames',
                            competitorNames.filter((c) => c !== name)
                          )
                        }
                        className='text-muted-foreground hover:text-foreground transition'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </span>
                  ))}
                  <div className='flex items-center gap-1'>
                    <Input
                      placeholder='Add competitor...'
                      value={competitorInput}
                      onChange={(e) => setCompetitorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCompetitor(competitorInput)
                        }
                      }}
                      className='h-9 w-40'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => addCompetitor(competitorInput)}
                      disabled={!competitorInput.trim()}
                    >
                      <PlusCircle className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Style - Collapsible */}
            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() =>
                  setIsCommentStyleExpanded(!isCommentStyleExpanded)
                }
              >
                <div className='flex items-center gap-2'>
                  <Smile className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Comment Style
                  </Label>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground transition-colors'>
                  {isCommentStyleExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>
              {isCommentStyleExpanded && (
                <div className='space-y-4 pt-2'>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='commentLength'
                      render={({ field }) => (
                        <FormItem className='space-y-2'>
                          <FormLabel className='text-sm font-medium'>
                            Comment Length
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='short'>
                                  Short (~10 words)
                                </SelectItem>
                                <SelectItem value='medium'>
                                  Medium (~15 words)
                                </SelectItem>
                                <SelectItem value='long'>
                                  Long (~25 words)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='commentsPerDay'
                      render={({ field }) => (
                        <FormItem className='space-y-2'>
                          <FormLabel className='text-sm font-medium'>
                            Comments Per Day
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              max={100}
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  Math.min(
                                    100,
                                    Math.max(1, Number(e.target.value))
                                  )
                                )
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='useEmojis'
                      render={({ field }) => (
                        <FormItem>
                          <div className='border-border flex items-center justify-between rounded-lg border p-3'>
                            <FormLabel className='text-sm font-medium'>
                              Use Emojis
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='useExclamations'
                      render={({ field }) => (
                        <FormItem>
                          <div className='border-border flex items-center justify-between rounded-lg border p-3'>
                            <FormLabel className='text-sm font-medium'>
                              Use Exclamations
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <OnboardingNavigation
            prevStep='/onboarding/post-settings'
            nextStep='/onboarding/identity'
            loading={isLoading}
            onNext={handleSubmit}
            currentStep='comment-settings'
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
