'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useProfileStore } from '@/stores/profile.store'
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
import { ICreateOnboardingPostDto } from '../interface/onboarding.interface'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useCreateOnboardingPostQuery } from '../query/onboarding.query'

const authorTitlesList = ['Founder', 'CEO', 'CTO', 'CMO', 'VP', 'Director']

const postSettingsSchema = z.object({
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

type PostSettingsValues = z.infer<typeof postSettingsSchema>

const defaultValues: PostSettingsValues = {
  selectedKeywords: ['AI', 'SaaS'],
  customKeywords: [],
  authorTitles: [],
  customTitles: [],
  skipHiringPosts: true,
  skipJobUpdatePosts: true,
}

export function PostSettingsStep() {
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [showCustomTitleInput, setShowCustomTitleInput] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [isEngagementExpanded, setIsEngagementExpanded] = useState(false)

  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { createOnboardingPost, isCreatingOnboardingPost } =
    useCreateOnboardingPostQuery()

  const form = useForm<PostSettingsValues>({
    resolver: zodResolver(postSettingsSchema),
    defaultValues,
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

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const allTitles = [...authorTitlesList, ...customTitles]

  // Check if "All" is selected (when no specific titles are selected)
  const isAllSelected = authorTitles.length === 0

  // Keyword functions
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

  const handleKeywordOtherClick = () => {
    setShowCustomKeywordInput(true)
  }

  const handleCustomKeywordSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmedKeyword = customKeyword.trim()
      if (
        trimmedKeyword &&
        !allKeywords.includes(trimmedKeyword) &&
        selectedKeywords.length < 6
      ) {
        const newCustomKeywords = [...customKeywords, trimmedKeyword]
        setValue('customKeywords', newCustomKeywords)
        setValue('selectedKeywords', [...selectedKeywords, trimmedKeyword])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  // Author Title functions
  const toggleTitle = (title: string) => {
    const isSelected = authorTitles.includes(title)
    if (!isSelected && authorTitles.length >= 3) return
    const updated = isSelected
      ? authorTitles.filter((t) => t !== title)
      : [...authorTitles, title]
    setValue('authorTitles', updated)
  }

  const toggleAll = () => {
    // If "All" is currently selected (no titles), do nothing
    // If specific titles are selected, deselect all of them (which selects "All")
    if (authorTitles.length > 0) {
      setValue('authorTitles', [])
    }
  }

  const handleTitleOtherClick = () => {
    if (authorTitles.length >= 3) return
    setShowCustomTitleInput(true)
  }

  const handleCustomTitleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmedTitle = customTitle.trim()
      if (trimmedTitle && !allTitles.includes(trimmedTitle)) {
        const newCustomTitles = [...customTitles, trimmedTitle]
        setValue('customTitles', newCustomTitles)
        setValue('authorTitles', [...authorTitles, trimmedTitle])
      }
      setCustomTitle('')
      setShowCustomTitleInput(false)
    }
  }

  const onSubmit = (data: PostSettingsValues) => {
    if (!activeProfile?._id) return

    const payload: ICreateOnboardingPostDto = {
      keywordsToTarget: data.selectedKeywords,
      authorTitles: data.authorTitles,
      skipHiringPosts: data.skipHiringPosts,
      skipJobUpdatePosts: data.skipJobUpdatePosts,
    }

    createOnboardingPost({
      profileId: activeProfile._id,
      data: payload,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <OnboardingCard
          title='Choose posts that matter'
          description="We'll only comment on posts that match your interests."
        >
          {/* Keywords Section */}
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
                      <p>
                        Select keywords related to your industry or interests to
                        find relevant posts for automated commenting
                      </p>
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
                      onClick={() => handleKeywordSelect(keyword)}
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
                            // Remove from custom list
                            setValue(
                              'customKeywords',
                              customKeywords.filter((k) => k !== keyword)
                            )
                            // If selected, also remove from selected keywords
                            if (selectedKeywords.includes(keyword)) {
                              setValue(
                                'selectedKeywords',
                                selectedKeywords.filter((k) => k !== keyword)
                              )
                            }
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
                    onClick={handleKeywordOtherClick}
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
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyPress={handleCustomKeywordSubmit}
                    onBlur={() => setShowCustomKeywordInput(false)}
                    autoFocus
                    className='h-10 w-32'
                  />
                )}
              </div>
              {errors.selectedKeywords && (
                <p className='text-destructive text-sm'>
                  {errors.selectedKeywords.message}
                </p>
              )}
            </div>
          </div>

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
                {/* All option */}
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
                            // Remove from custom titles list
                            setValue(
                              'customTitles',
                              customTitles.filter((t) => t !== title)
                            )
                            // If selected, also remove from selected author titles
                            if (authorTitles.includes(title)) {
                              setValue(
                                'authorTitles',
                                authorTitles.filter((t) => t !== title)
                              )
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
                    onClick={handleTitleOtherClick}
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

          {/* Miscellaneous Section */}
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
                {/* Skip Options */}
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
            nextStep='/onboarding/comment-settings'
            loading={isCreatingOnboardingPost}
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
