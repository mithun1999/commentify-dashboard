'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronUp,
  Hash,
  Info,
  PlusCircle,
  X,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUpdateOnboardingStatus } from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useTrackStepView } from '../hooks/useTrackStepView'
import { useCreateOnboardingTwitterPostQuery } from '../query/onboarding.query'

const MAX_KEYWORDS = 6
const MAX_HASHTAGS = 6

/**
 * Overwritten by the reply-style step, which asks for a daily volume directly.
 * Kept here so the scrape setting is valid the moment targeting is saved,
 * rather than depending on the next screen being reached.
 */
const DEFAULT_TWEETS_PER_DAY = 20

const schema = z.object({
  selectedKeywords: z
    .array(z.string())
    .min(1, 'Please select at least one keyword')
    .max(MAX_KEYWORDS, `Maximum ${MAX_KEYWORDS} keywords allowed`),
  customKeywords: z.array(z.string()),
  selectedHashtags: z
    .array(z.string())
    .max(MAX_HASHTAGS, `Maximum ${MAX_HASHTAGS} hashtags`),
  customHashtags: z.array(z.string()),
})

type TargetingValues = z.infer<typeof schema>

const defaultValues: TargetingValues = {
  selectedKeywords: ['AI', 'SaaS'],
  customKeywords: [],
  selectedHashtags: [],
  customHashtags: [],
}

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

export function TwitterTargetingStep() {
  useTrackStepView('post-settings')

  const posthog = usePostHog()
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [showCustomHashtagInput, setShowCustomHashtagInput] = useState(false)
  const [customHashtag, setCustomHashtag] = useState('')
  const [isHashtagsExpanded, setIsHashtagsExpanded] = useState(false)

  const { data: onboardingData, markStepCompleted, updateData } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id

  const {
    createOnboardingTwitterPostSettingAsync,
    isCreatingOnboardingTwitterPost,
  } = useCreateOnboardingTwitterPostQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const form = useForm<TargetingValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      selectedKeywords: onboardingData.scrapeSetting.keywordsToTarget.length
        ? onboardingData.scrapeSetting.keywordsToTarget.slice(0, MAX_KEYWORDS)
        : defaultValues.selectedKeywords,
    },
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

  const allKeywords = [
    ...predefinedKeywords,
    ...selectedKeywords.filter((k) => !predefinedKeywords.includes(k)),
    ...customKeywords.filter((k) => !selectedKeywords.includes(k)),
  ]
  const allHashtags = [...predefinedHashtags, ...customHashtags]

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setValue(
        'selectedKeywords',
        selectedKeywords.filter((k) => k !== keyword)
      )
    } else if (selectedKeywords.length < MAX_KEYWORDS) {
      setValue('selectedKeywords', [...selectedKeywords, keyword])
    }
  }

  const submitCustomKeyword = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    // Enter inside a form input submits it, which would skip validation and
    // navigation entirely.
    e.preventDefault()
    const trimmed = customKeyword.trim()
    if (
      trimmed &&
      !allKeywords.includes(trimmed) &&
      selectedKeywords.length < MAX_KEYWORDS
    ) {
      setValue('customKeywords', [...customKeywords, trimmed])
      setValue('selectedKeywords', [...selectedKeywords, trimmed])
    }
    setCustomKeyword('')
    setShowCustomKeywordInput(false)
  }

  const toggleHashtag = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setValue(
        'selectedHashtags',
        selectedHashtags.filter((t) => t !== tag)
      )
    } else if (selectedHashtags.length < MAX_HASHTAGS) {
      setValue('selectedHashtags', [...selectedHashtags, tag])
    }
  }

  const submitCustomHashtag = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = customHashtag.trim().replace(/^#/, '')
    if (
      trimmed &&
      !allHashtags.includes(trimmed) &&
      selectedHashtags.length < MAX_HASHTAGS
    ) {
      setValue('customHashtags', [...customHashtags, trimmed])
      setValue('selectedHashtags', [...selectedHashtags, trimmed])
    }
    setCustomHashtag('')
    setShowCustomHashtagInput(false)
  }

  const save = async (data: TargetingValues) => {
    posthog?.capture('onboarding_post_setting_form_submitted', {
      platform: 'twitter',
      selectedKeywordsCount: data.selectedKeywords.length,
      hashtagsCount: data.selectedHashtags.length,
    })

    if (!resolvedProfileId) {
      toast.error(
        'No connected profile found. Please go back and connect your account first.'
      )
      return false
    }

    try {
      await createOnboardingTwitterPostSettingAsync({
        profileId: resolvedProfileId,
        data: {
          anyOfTheseWords: data.selectedKeywords,
          theseHashtags: data.selectedHashtags,
          numberOfPostsToScrapePerDay: DEFAULT_TWEETS_PER_DAY,
        },
      })
      updateData({
        scrapeSetting: {
          ...onboardingData.scrapeSetting,
          keywordsToTarget: data.selectedKeywords,
        },
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)}>
        <OnboardingCard
          title='Choose tweets that matter'
          description='Your agent only replies to tweets matching what you pick here.'
        >
          <div className='mb-6'>
            <div className='mb-4 flex items-center gap-x-6'>
              <div className='flex items-center gap-2'>
                <Hash className='text-muted-foreground h-4 w-4' />
                <span className='text-foreground font-semibold'>
                  Target Keywords (Choose up to {MAX_KEYWORDS})
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                        <Info className='text-muted-foreground h-3 w-3' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='right' className='max-w-xs'>
                      <p>
                        Your agent searches X for these words and replies to
                        what it finds.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className='text-muted-foreground text-sm'>
                {selectedKeywords.length}/{MAX_KEYWORDS} keywords selected
              </p>
            </div>

            <div className='space-y-3'>
              <div className='flex flex-wrap gap-3'>
                {allKeywords.map((keyword) => {
                  const isSelected = selectedKeywords.includes(keyword)
                  const isDisabled =
                    !isSelected && selectedKeywords.length >= MAX_KEYWORDS

                  return (
                    <button
                      key={keyword}
                      type='button'
                      onClick={() => toggleKeyword(keyword)}
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
                            setValue(
                              'customKeywords',
                              customKeywords.filter((k) => k !== keyword)
                            )
                            setValue(
                              'selectedKeywords',
                              selectedKeywords.filter((k) => k !== keyword)
                            )
                          }}
                        >
                          <X className='h-3.5 w-3.5' />
                        </button>
                      )}
                    </button>
                  )
                })}

                {!showCustomKeywordInput ? (
                  <button
                    type='button'
                    onClick={() => setShowCustomKeywordInput(true)}
                    disabled={selectedKeywords.length >= MAX_KEYWORDS}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                      selectedKeywords.length >= MAX_KEYWORDS
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
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyDown={submitCustomKeyword}
                    onBlur={() => setShowCustomKeywordInput(false)}
                    autoFocus
                    className='h-10 w-32'
                  />
                )}
              </div>
              {errors.selectedKeywords?.message && (
                <p className='text-destructive text-sm'>
                  {errors.selectedKeywords.message}
                </p>
              )}
            </div>
          </div>

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
                  <span className='text-muted-foreground text-xs'>
                    Optional
                  </span>
                </div>
                {selectedHashtags.length > 0 && (
                  <p className='text-muted-foreground text-sm'>
                    {selectedHashtags.length}/{MAX_HASHTAGS} selected
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
              <div className='mt-4 flex flex-wrap gap-3'>
                {allHashtags.map((tag) => {
                  const isSelected = selectedHashtags.includes(tag)
                  const isDisabled =
                    !isSelected && selectedHashtags.length >= MAX_HASHTAGS

                  return (
                    <button
                      key={tag}
                      type='button'
                      onClick={() => toggleHashtag(tag)}
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
                            setValue(
                              'customHashtags',
                              customHashtags.filter((t) => t !== tag)
                            )
                            setValue(
                              'selectedHashtags',
                              selectedHashtags.filter((t) => t !== tag)
                            )
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
                    disabled={selectedHashtags.length >= MAX_HASHTAGS}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                      selectedHashtags.length >= MAX_HASHTAGS
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
                    onKeyDown={submitCustomHashtag}
                    onBlur={() => setShowCustomHashtagInput(false)}
                    autoFocus
                    className='h-10 w-32'
                  />
                )}
              </div>
            )}
          </div>

          <OnboardingNavigation
            prevStep='/onboarding/connect-account'
            nextStep='/onboarding/comment-settings'
            currentStep='post-settings'
            loading={
              isCreatingOnboardingTwitterPost || isUpdatingOnboardingStatus
            }
            onNext={async () => {
              if (!(await form.trigger())) return false
              if (!(await save(form.getValues()))) return false

              markStepCompleted('post-settings')
              await updateOnboardingStatusAsync({
                status: 'in-progress',
                stepKey: 'comment-settings',
              })
              return true
            }}
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
