'use client'

import { lazy, Suspense, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Hash,
  Info,
  PlusCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  CircleSlash,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { getAgentType } from '@/features/agent-system/registry'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useTrackStepView } from '../hooks/useTrackStepView'
import {
  useCreateOnboardingPostQuery,
  useCreateOnboardingTwitterPostQuery,
} from '../query/onboarding.query'

// ── LinkedIn schema & defaults ───────────────────────────────────────────────

const authorTitlesList = ['Founder', 'CEO', 'CTO', 'CMO', 'VP', 'Director']

const linkedinSchema = z.object({
  selectedKeywords: z
    .array(z.string())
    .min(1, 'Please select at least one keyword')
    .max(6, 'Maximum 6 keywords allowed'),
  customKeywords: z.array(z.string()),
  authorTitles: z.array(z.string()),
  customTitles: z.array(z.string()),
  skipHiringPosts: z.boolean(),
  skipJobUpdatePosts: z.boolean(),
})

type LinkedInValues = z.infer<typeof linkedinSchema>

const linkedinDefaults: LinkedInValues = {
  selectedKeywords: ['AI', 'SaaS'],
  customKeywords: [],
  authorTitles: [],
  customTitles: [],
  skipHiringPosts: true,
  skipJobUpdatePosts: true,
}

// ── Twitter schema & defaults ────────────────────────────────────────────────

const twitterSchema = z.object({
  selectedKeywords: z
    .array(z.string())
    .min(1, 'Please select at least one keyword')
    .max(6, 'Maximum 6 keywords allowed'),
  customKeywords: z.array(z.string()),
  selectedHashtags: z.array(z.string()).max(6, 'Maximum 6 hashtags'),
  customHashtags: z.array(z.string()),
  tweetsPerDay: z.number().min(1).max(100),
})

type TwitterValues = z.infer<typeof twitterSchema>

const twitterDefaults: TwitterValues = {
  selectedKeywords: ['AI', 'SaaS'],
  customKeywords: [],
  selectedHashtags: [],
  customHashtags: [],
  tweetsPerDay: 20,
}

// ── Shared constants ─────────────────────────────────────────────────────────

const predefinedKeywords = [
  'AI',
  'SaaS',
  'Startup',
  'Marketing',
  'Sales',
  'Leadership',
  'Finance',
  'Operations',
  'Growth',
]

const predefinedHashtags = [
  'buildinpublic',
  'startup',
  'AI',
  'SaaS',
  'tech',
  'growthhacking',
  'indiehacker',
  'marketing',
]

// ── Main component ───────────────────────────────────────────────────────────

const LazySalesProductSetupStep = lazy(() =>
  import('@/features/linkedin-sales/components/sales-product-setup-step').then(
    (m) => ({ default: m.SalesProductSetupStep })
  )
)

export function PostSettingsStep() {
  useTrackStepView('post-settings')
  const { data: onboardingData } = useOnboarding()
  const { data: user } = useGetUserQuery()
  const selectedSlug = onboardingData.selectedAgentType
    ?? user?.metadata?.onboarding?.selectedAgentType
    ?? null
  const agentDef = selectedSlug ? getAgentType(selectedSlug) : null
  const platform = agentDef?.platform ?? 'linkedin'
  const agentMode = onboardingData.selectedAgentMode

  if (platform === 'linkedin' && agentMode === 'sales') {
    return (
      <Suspense fallback={<div className='flex items-center justify-center py-12'>Loading...</div>}>
        <LazySalesProductSetupStep />
      </Suspense>
    )
  }
  if (platform === 'twitter') return <TwitterPostSettings />
  return <LinkedInPostSettings />
}

// ── LinkedIn variant ─────────────────────────────────────────────────────────

function LinkedInPostSettings() {
  const posthog = usePostHog()
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [showCustomTitleInput, setShowCustomTitleInput] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [isEngagementExpanded, setIsEngagementExpanded] = useState(false)

  const { data: onboardingData, markStepCompleted } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id
  const { createOnboardingPostSettingAsync, isCreatingOnboardingPost } =
    useCreateOnboardingPostQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const form = useForm<LinkedInValues>({
    resolver: zodResolver(linkedinSchema),
    defaultValues: linkedinDefaults,
  })

  const {
    watch,
    setValue,
    formState: { errors },
  } = form
  const selectedKeywords = watch('selectedKeywords')
  const customKeywords = watch('customKeywords')
  const authorTitles = watch('authorTitles')
  const customTitles = watch('customTitles')

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const allTitles = [...authorTitlesList, ...customTitles]
  const isAllSelected = authorTitles.length === 0

  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setValue(
        'selectedKeywords',
        selectedKeywords.filter((k) => k !== keyword)
      )
    } else if (selectedKeywords.length < 6) {
      setValue('selectedKeywords', [...selectedKeywords, keyword])
    }
  }

  const handleCustomKeywordSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = customKeyword.trim()
      if (trimmed && !allKeywords.includes(trimmed) && selectedKeywords.length < 6) {
        setValue('customKeywords', [...customKeywords, trimmed])
        setValue('selectedKeywords', [...selectedKeywords, trimmed])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  const toggleTitle = (title: string) => {
    const isSelected = authorTitles.includes(title)
    if (!isSelected && authorTitles.length >= 3) return
    setValue(
      'authorTitles',
      isSelected ? authorTitles.filter((t) => t !== title) : [...authorTitles, title]
    )
  }

  const toggleAll = () => {
    if (authorTitles.length > 0) setValue('authorTitles', [])
  }

  const handleCustomTitleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = customTitle.trim()
      if (trimmed && !allTitles.includes(trimmed)) {
        setValue('customTitles', [...customTitles, trimmed])
        setValue('authorTitles', [...authorTitles, trimmed])
      }
      setCustomTitle('')
      setShowCustomTitleInput(false)
    }
  }

  const onSubmit = async (data: LinkedInValues) => {
    posthog?.capture('onboarding_post_setting_form_submitted', {
      platform: 'linkedin',
      selectedKeywordsCount: data.selectedKeywords.length,
      authorTitlesCount: data.authorTitles.length,
    })

    if (!resolvedProfileId) {
      toast.error('No connected profile found. Please go back and connect your account first.')
      return false
    }

    try {
      await createOnboardingPostSettingAsync({
        profileId: resolvedProfileId,
        data: {
          keywordsToTarget: data.selectedKeywords,
          authorTitles: data.authorTitles,
          skipHiringPosts: data.skipHiringPosts,
          skipJobUpdatePosts: data.skipJobUpdatePosts,
        },
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <OnboardingCard
          title='Choose posts that matter'
          description="We'll only comment on posts that match your interests."
        >
          <KeywordChipSection
            selectedKeywords={selectedKeywords}
            allKeywords={allKeywords}
            customKeywords={customKeywords}
            onSelect={handleKeywordSelect}
            showCustomInput={showCustomKeywordInput}
            onShowCustomInput={() => setShowCustomKeywordInput(true)}
            customValue={customKeyword}
            onCustomChange={setCustomKeyword}
            onCustomSubmit={handleCustomKeywordSubmit}
            onCustomBlur={() => setShowCustomKeywordInput(false)}
            onRemoveCustom={(kw) => {
              setValue('customKeywords', customKeywords.filter((k) => k !== kw))
              if (selectedKeywords.includes(kw)) {
                setValue('selectedKeywords', selectedKeywords.filter((k) => k !== kw))
              }
            }}
            error={errors.selectedKeywords?.message}
            tooltipText='Select keywords related to your industry or interests to find relevant posts for automated commenting'
          />

          {/* Author Titles Section */}
          <div className='mb-6 space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex w-full items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <Filter className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground font-medium'>
                    Post Author Titles
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
                          Select titles of authors whose posts
                          <br />
                          you want to engage with
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className='text-muted-foreground text-sm'>
                  {!isAllSelected && `${authorTitles.length}/3 titles selected`}
                </p>
              </div>
            </div>

            <div className='mt-4 space-y-3'>
              <div className='flex flex-wrap gap-3'>
                <button
                  type='button'
                  onClick={toggleAll}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                    isAllSelected
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <span className='text-sm font-medium'>All</span>
                </button>

                {allTitles.map((title) => {
                  const isSelected = authorTitles.includes(title)
                  return (
                    <button
                      key={title}
                      type='button'
                      onClick={() => toggleTitle(title)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      <span className='text-sm font-medium'>{title}</span>
                      {customTitles.includes(title) && (
                        <button
                          type='button'
                          aria-label={`Remove ${title}`}
                          className='text-muted-foreground/80 hover:text-foreground transition'
                          onClick={(e) => {
                            e.stopPropagation()
                            setValue('customTitles', customTitles.filter((t) => t !== title))
                            if (authorTitles.includes(title)) {
                              setValue('authorTitles', authorTitles.filter((t) => t !== title))
                            }
                          }}
                        >
                          <X className='h-3.5 w-3.5' />
                        </button>
                      )}
                    </button>
                  )
                })}

                {!showCustomTitleInput ? (
                  <button
                    type='button'
                    onClick={() => {
                      if (authorTitles.length < 3) setShowCustomTitleInput(true)
                    }}
                    disabled={isAllSelected}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                      isAllSelected
                        ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                    }`}
                  >
                    <span className='flex items-center gap-1 text-sm font-medium'>
                      <PlusCircle className='h-4 w-4' />
                      Other
                    </span>
                  </button>
                ) : (
                  <Input
                    placeholder='Enter title...'
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyPress={handleCustomTitleSubmit}
                    onBlur={() => setShowCustomTitleInput(false)}
                    autoFocus
                    className='h-10 w-32'
                  />
                )}
              </div>
            </div>
          </div>

          {/* Exclusions Section */}
          <div className='mb-6 space-y-2'>
            <div
              className='group flex cursor-pointer items-center justify-between'
              onClick={() => setIsEngagementExpanded(!isEngagementExpanded)}
            >
              <div className='flex items-center gap-2'>
                <CircleSlash className='text-muted-foreground h-4 w-4' />
                <Label className='text-foreground cursor-pointer font-medium'>
                  Exclusions
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
                        Additional settings for post filtering and commenting
                        preferences.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                {isEngagementExpanded ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </div>

            {isEngagementExpanded && (
              <div className='mt-4 space-y-4'>
                <div className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='skipHiringPosts'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                          <div className='space-y-0.5'>
                            <FormLabel className='text-sm font-semibold'>
                              Don't comment on job openings
                            </FormLabel>
                            <p className='text-muted-foreground text-sm'>
                              Exclude from commenting list
                            </p>
                          </div>
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
                    name='skipJobUpdatePosts'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                          <div className='space-y-0.5'>
                            <FormLabel className='text-sm font-semibold'>
                              Don't comment on "started a new job" updates
                            </FormLabel>
                            <p className='text-muted-foreground text-sm'>
                              Exclude from commenting list
                            </p>
                          </div>
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

          <OnboardingNavigation
            prevStep='/onboarding/connect-account'
            nextStep='/onboarding/comment-settings'
            loading={isCreatingOnboardingPost || isUpdatingOnboardingStatus}
            onNext={async () => {
              const isValid = await form.trigger()
              if (!isValid) return false

              const values = form.getValues()
              const result = await onSubmit(values)
              if (!result) return false

              markStepCompleted('post-settings')
              await updateOnboardingStatusAsync({ status: 'in-progress', step: 4 })
              return true
            }}
            currentStep='post-settings'
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}

// ── Twitter variant ──────────────────────────────────────────────────────────

function TwitterPostSettings() {
  const posthog = usePostHog()
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [showCustomHashtagInput, setShowCustomHashtagInput] = useState(false)
  const [customHashtag, setCustomHashtag] = useState('')
  const [isHashtagsExpanded, setIsHashtagsExpanded] = useState(false)

  const { data: onboardingData, markStepCompleted } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id
  const { createOnboardingTwitterPostSettingAsync, isCreatingOnboardingTwitterPost } =
    useCreateOnboardingTwitterPostQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const form = useForm<TwitterValues>({
    resolver: zodResolver(twitterSchema),
    defaultValues: twitterDefaults,
  })

  const {
    watch,
    setValue,
    formState: { errors },
  } = form
  const selectedKeywords = watch('selectedKeywords')
  const customKeywords = watch('customKeywords')
  const selectedHashtags = watch('selectedHashtags')
  const customHashtags = watch('customHashtags')

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const allHashtags = [...predefinedHashtags, ...customHashtags]

  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setValue('selectedKeywords', selectedKeywords.filter((k) => k !== keyword))
    } else if (selectedKeywords.length < 6) {
      setValue('selectedKeywords', [...selectedKeywords, keyword])
    }
  }

  const handleCustomKeywordSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = customKeyword.trim()
      if (trimmed && !allKeywords.includes(trimmed) && selectedKeywords.length < 6) {
        setValue('customKeywords', [...customKeywords, trimmed])
        setValue('selectedKeywords', [...selectedKeywords, trimmed])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  const handleHashtagSelect = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setValue('selectedHashtags', selectedHashtags.filter((t) => t !== tag))
    } else if (selectedHashtags.length < 6) {
      setValue('selectedHashtags', [...selectedHashtags, tag])
    }
  }

  const handleCustomHashtagSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = customHashtag.trim().replace(/^#/, '')
      if (trimmed && !allHashtags.includes(trimmed) && selectedHashtags.length < 6) {
        setValue('customHashtags', [...customHashtags, trimmed])
        setValue('selectedHashtags', [...selectedHashtags, trimmed])
      }
      setCustomHashtag('')
      setShowCustomHashtagInput(false)
    }
  }

  const onSubmit = async (data: TwitterValues) => {
    posthog?.capture('onboarding_post_setting_form_submitted', {
      platform: 'twitter',
      selectedKeywordsCount: data.selectedKeywords.length,
      hashtagsCount: data.selectedHashtags.length,
      tweetsPerDay: data.tweetsPerDay,
    })

    if (!resolvedProfileId) {
      toast.error('No connected profile found. Please go back and connect your account first.')
      return false
    }

    try {
      await createOnboardingTwitterPostSettingAsync({
        profileId: resolvedProfileId,
        data: {
          anyOfTheseWords: data.selectedKeywords,
          theseHashtags: data.selectedHashtags,
          numberOfPostsToScrapePerDay: data.tweetsPerDay,
        },
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <OnboardingCard
          title='Choose tweets that matter'
          description="We'll only reply to tweets matching your interests."
        >
          <KeywordChipSection
            selectedKeywords={selectedKeywords}
            allKeywords={allKeywords}
            customKeywords={customKeywords}
            onSelect={handleKeywordSelect}
            showCustomInput={showCustomKeywordInput}
            onShowCustomInput={() => setShowCustomKeywordInput(true)}
            customValue={customKeyword}
            onCustomChange={setCustomKeyword}
            onCustomSubmit={handleCustomKeywordSubmit}
            onCustomBlur={() => setShowCustomKeywordInput(false)}
            onRemoveCustom={(kw) => {
              setValue('customKeywords', customKeywords.filter((k) => k !== kw))
              if (selectedKeywords.includes(kw)) {
                setValue('selectedKeywords', selectedKeywords.filter((k) => k !== kw))
              }
            }}
            error={errors.selectedKeywords?.message}
            tooltipText='Select keywords to find relevant tweets for automated replying'
          />

          {/* Hashtags – collapsible */}
          <div className='mb-6 space-y-2'>
            <div
              className='group flex cursor-pointer items-center justify-between'
              onClick={() => setIsHashtagsExpanded(!isHashtagsExpanded)}
            >
              <div className='flex items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <Hash className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Target Hashtags
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
                          Pick hashtags to find tweets in specific communities
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {selectedHashtags.length > 0 && (
                  <p className='text-muted-foreground text-sm'>
                    {selectedHashtags.length}/6 selected
                  </p>
                )}
              </div>
              <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                {isHashtagsExpanded ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </div>

            {isHashtagsExpanded && (
              <div className='mt-4 space-y-3'>
                <div className='flex flex-wrap gap-3'>
                  {allHashtags.map((tag) => {
                    const isSelected = selectedHashtags.includes(tag)
                    const isDisabled = !isSelected && selectedHashtags.length >= 6

                    return (
                      <button
                        key={tag}
                        type='button'
                        onClick={() => handleHashtagSelect(tag)}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : isDisabled
                              ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                              : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                        }`}
                      >
                        <span className='text-sm font-medium'>#{tag}</span>
                        {customHashtags.includes(tag) && (
                          <button
                            type='button'
                            aria-label={`Remove #${tag}`}
                            className='text-muted-foreground/80 hover:text-foreground transition'
                            onClick={(e) => {
                              e.stopPropagation()
                              setValue('customHashtags', customHashtags.filter((t) => t !== tag))
                              if (selectedHashtags.includes(tag)) {
                                setValue('selectedHashtags', selectedHashtags.filter((t) => t !== tag))
                              }
                            }}
                          >
                            <X className='h-3.5 w-3.5' />
                          </button>
                        )}
                      </button>
                    )
                  })}

                  {!showCustomHashtagInput ? (
                    <button
                      type='button'
                      onClick={() => setShowCustomHashtagInput(true)}
                      disabled={selectedHashtags.length >= 6}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                        selectedHashtags.length >= 6
                          ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                          : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      <span className='flex items-center gap-1 text-sm font-medium'>
                        <PlusCircle className='h-4 w-4' />
                        Other
                      </span>
                    </button>
                  ) : (
                    <Input
                      placeholder='#hashtag'
                      value={customHashtag}
                      onChange={(e) => setCustomHashtag(e.target.value)}
                      onKeyPress={handleCustomHashtagSubmit}
                      onBlur={() => setShowCustomHashtagInput(false)}
                      autoFocus
                      className='h-10 w-32'
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <OnboardingNavigation
            prevStep='/onboarding/connect-account'
            nextStep='/onboarding/comment-settings'
            loading={isCreatingOnboardingTwitterPost || isUpdatingOnboardingStatus}
            onNext={async () => {
              const isValid = await form.trigger()
              if (!isValid) return false

              const values = form.getValues()
              const result = await onSubmit(values)
              if (!result) return false

              markStepCompleted('post-settings')
              await updateOnboardingStatusAsync({ status: 'in-progress', step: 4 })
              return true
            }}
            currentStep='post-settings'
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}

// ── Shared keyword chip section ──────────────────────────────────────────────

function KeywordChipSection({
  selectedKeywords,
  allKeywords,
  customKeywords,
  onSelect,
  showCustomInput,
  onShowCustomInput,
  customValue,
  onCustomChange,
  onCustomSubmit,
  onCustomBlur,
  onRemoveCustom,
  error,
  tooltipText,
}: {
  selectedKeywords: string[]
  allKeywords: string[]
  customKeywords: string[]
  onSelect: (kw: string) => void
  showCustomInput: boolean
  onShowCustomInput: () => void
  customValue: string
  onCustomChange: (v: string) => void
  onCustomSubmit: (e: React.KeyboardEvent) => void
  onCustomBlur: () => void
  onRemoveCustom: (kw: string) => void
  error?: string
  tooltipText: string
}) {
  return (
    <div className='mb-6'>
      <div className='mb-4 flex items-center gap-x-6'>
        <div className='flex items-center gap-2'>
          <Hash className='text-muted-foreground h-4 w-4' />
          <span className='text-foreground font-semibold'>
            Target Keywords (Choose up to 6)
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                  <Info className='text-muted-foreground h-3 w-3' />
                </div>
              </TooltipTrigger>
              <TooltipContent side='right' className='max-w-xs'>
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className='text-muted-foreground text-sm'>
          {selectedKeywords.length}/6 keywords selected
        </p>
      </div>

      <div className='space-y-3'>
        <div className='flex flex-wrap gap-3'>
          {allKeywords.map((keyword) => {
            const isSelected = selectedKeywords.includes(keyword)
            const isDisabled = !isSelected && selectedKeywords.length >= 6

            return (
              <button
                key={keyword}
                type='button'
                onClick={() => onSelect(keyword)}
                disabled={isDisabled}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary'
                    : isDisabled
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                      : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <span className='text-sm font-medium'>{keyword}</span>
                {customKeywords.includes(keyword) && (
                  <button
                    type='button'
                    aria-label={`Remove ${keyword}`}
                    className='text-muted-foreground/80 hover:text-foreground transition'
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveCustom(keyword)
                    }}
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                )}
              </button>
            )
          })}

          {!showCustomInput ? (
            <button
              type='button'
              onClick={onShowCustomInput}
              disabled={selectedKeywords.length >= 6}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                selectedKeywords.length >= 6
                  ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                  : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <span className='flex items-center gap-1 text-sm font-medium'>
                <PlusCircle className='h-4 w-4' />
                Other
              </span>
            </button>
          ) : (
            <Input
              placeholder='Enter keyword...'
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              onKeyPress={onCustomSubmit}
              onBlur={onCustomBlur}
              autoFocus
              className='h-10 w-32'
            />
          )}
        </div>
        {error && <p className='text-destructive text-sm'>{error}</p>}
      </div>
    </div>
  )
}
