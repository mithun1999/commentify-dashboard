'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { planSetting } from '@/config/plan-setting.config'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Globe,
  Info,
  PlusCircle,
  X,
} from 'lucide-react'
import { useProfileStore } from '@/stores/profile.store'
import {
  Hour12,
  MinuteQuarter,
  Period,
  toPaddedHourAndPeriod,
  toQuarterMinute,
  toUTCFromLocalSelection,
  wallTimeInZoneToLocal,
} from '@/lib/date.utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SelectDropdown } from '@/components/select-dropdown'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import {
  useCreateScrapeSettingQuery,
  useUpdateScrapeSettingQuery,
} from '@/features/settings/query/setting.query'
import { buildSearchUrl } from '@/features/settings/utils/linkedin.util'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { UnlockWrapper } from '../components/UnlockWrapper'

const notificationsFormSchema = z.object({
  keywords: z.array(z.string()).max(6),
  authorTitles: z.array(z.string()).max(3),
  geography: z.array(z.string()),
  numberOfPostsToScrapePerDay: z.number().min(1).max(100),
  engagementThreshold: z.enum(['strict', 'moderate', 'disabled']),
  skipHiringPosts: z.boolean(),
  skipJobUpdatePosts: z.boolean(),
  skipArticlePosts: z.boolean(),
  autoSchedule: z.boolean(),
  rules: z.string().optional(),
  startHour: z.enum([
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
  ]) as z.ZodType<Hour12>,
  startMinute: z.enum(['00', '15', '30', '45']) as z.ZodType<MinuteQuarter>,
  startPeriod: z.enum(['AM', 'PM']) as z.ZodType<Period>,
})

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>

const authorTitlesList = ['Founder', 'CEO', 'CTO', 'CMO', 'VP', 'Director']
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

export function PostForm() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: user } = useGetUserQuery()
  const userPlan =
    (user?.subscribedProduct?.name?.toLowerCase() as
      | 'starter'
      | 'pro'
      | 'premium') ?? 'starter'
  const { createScrapeSetting, isCreatingScrapeSetting } =
    useCreateScrapeSettingQuery()
  const { updateScrapeSetting, isUpdatingScrapeSetting } =
    useUpdateScrapeSettingQuery()
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [customKeywords, setCustomKeywords] = useState<string[]>([])
  const [showCustomTitleInput, setShowCustomTitleInput] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customTitles, setCustomTitles] = useState<string[]>([])

  const isProfileActive = activeProfile?.status === ProfileStatusEnum.OK

  const shouldDisplayEngagementThresholdSetting = Boolean(
    planSetting['engagementThreshold']?.[userPlan]
  )

  const shouldDisplayGeographySetting = Boolean(
    planSetting['geography']?.[userPlan]
  )
  const shouldDisplayAuthorTitlesSetting = Boolean(
    planSetting['authorTitles']?.[userPlan]
  )

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      keywords: ['AI', 'SaaS'],
      authorTitles: [],
      geography: ['Global'],
      numberOfPostsToScrapePerDay: 20,
      engagementThreshold: 'moderate',
      skipHiringPosts: true,
      skipJobUpdatePosts: true,
      skipArticlePosts: true,
      autoSchedule: true,
      rules: '',
      startHour: '09',
      startMinute: '00',
      startPeriod: 'AM',
    },
    shouldUnregister: false,
    mode: 'onSubmit',
  })

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const allTitles = [...authorTitlesList, ...customTitles]
  const selectedKeywords = form.watch('keywords') || []
  const authorTitles = form.watch('authorTitles') || []
  const selectedGeographies = form.watch('geography') || []

  // Build LinkedIn search URL for selected keywords
  const liSearchUrl = buildSearchUrl(selectedKeywords)

  const populateFromSetting = () => {
    if (!activeProfile?.setting) return
    const scrape = activeProfile.setting.scrapeSetting
    const existingKeywords = Array.isArray(scrape?.keywordsToTarget)
      ? scrape.keywordsToTarget
      : []
    const existingTitles = Array.isArray(scrape?.authorTitlesToTarget)
      ? scrape.authorTitlesToTarget
      : []

    // Ensure UI can render custom entries
    const extraKeywords = existingKeywords.filter(
      (k) => !predefinedKeywords.includes(k)
    )
    if (extraKeywords.length) setCustomKeywords(extraKeywords)
    const extraTitles = existingTitles.filter(
      (t) => !authorTitlesList.includes(t)
    )
    if (extraTitles.length) setCustomTitles(extraTitles)

    const { hours24, minutes } = wallTimeInZoneToLocal(
      scrape.jobTiming.hours,
      scrape.jobTiming.minutes,
      scrape.jobTiming.tz
    )

    const hp = toPaddedHourAndPeriod(hours24)

    const paddedHour = (hp.hour || '09').padStart(2, '0') as Hour12

    const q = toQuarterMinute(minutes)
    const minute = ['00', '15', '30', '45'].includes(q) ? q : '00'

    const period = hp.period === 'AM' || hp.period === 'PM' ? hp.period : 'AM'

    form.reset({
      keywords: existingKeywords.length
        ? existingKeywords
        : form.getValues('keywords'),
      authorTitles: existingTitles.length
        ? existingTitles
        : form.getValues('authorTitles'),
      geography: scrape?.regionsToTarget ?? form.getValues('geography'),
      numberOfPostsToScrapePerDay:
        typeof scrape?.numberOfPostsToScrapePerDay === 'number'
          ? scrape.numberOfPostsToScrapePerDay
          : form.getValues('numberOfPostsToScrapePerDay'),
      engagementThreshold:
        scrape?.engagementThreshold ?? form.getValues('engagementThreshold'),
      skipHiringPosts:
        typeof scrape?.skipHiringPosts === 'boolean'
          ? scrape.skipHiringPosts
          : form.getValues('skipHiringPosts'),
      skipJobUpdatePosts:
        typeof scrape?.skipJobUpdatePosts === 'boolean'
          ? scrape.skipJobUpdatePosts
          : form.getValues('skipJobUpdatePosts'),
      skipArticlePosts:
        typeof scrape?.skipArticlePosts === 'boolean'
          ? scrape.skipArticlePosts
          : form.getValues('skipArticlePosts'),
      autoSchedule: scrape?.autoSchedule ?? form.getValues('autoSchedule'),
      rules: scrape?.rules ?? form.getValues('rules'),
      startHour: paddedHour ?? '09',
      startMinute: minute ?? '00',
      startPeriod: period ?? 'AM',
    })
  }

  useEffect(() => {
    populateFromSetting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.setting?.scrapeSetting?._id])

  const handleSubmitForm = (values: NotificationsFormValues) => {
    if (!activeProfile?._id) return
    const plan = (userPlan ?? 'starter') as 'starter' | 'pro' | 'premium'
    const { hours, minutes } = toUTCFromLocalSelection(
      values.startHour as any,
      values.startMinute as any,
      values.startPeriod as any
    )

    const payload = {
      profileId: activeProfile._id,
      userPlan: plan,
      keywordsToTarget: values.keywords,
      skipHiringPosts: values.skipHiringPosts,
      skipJobUpdatePosts: values.skipJobUpdatePosts,
      skipArticlePosts: values.skipArticlePosts,
      autoSchedule: values.autoSchedule,
      numberOfPostsToScrapePerDay: values.numberOfPostsToScrapePerDay,
      jobTiming: {
        hours,
        minutes,
        tz: 'UTC',
      },
      engagementThreshold: values.engagementThreshold,
      regionsToTarget: values.geography,
      authorTitlesToTarget: values.authorTitles,
      rules: values.rules,
    }

    const hasExisting = Boolean(activeProfile?.setting?.scrapeSetting?._id)
    if (hasExisting) {
      updateScrapeSetting(payload)
    } else {
      createScrapeSetting(payload)
    }
  }

  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      form.setValue(
        'keywords',
        selectedKeywords.filter((k) => k !== keyword)
      )
    } else if (selectedKeywords.length < 6) {
      form.setValue('keywords', [...selectedKeywords, keyword])
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
        setCustomKeywords([...customKeywords, trimmedKeyword])
        form.setValue('keywords', [...selectedKeywords, trimmedKeyword])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  const toggleTitle = (title: string) => {
    const isSelected = authorTitles.includes(title)
    if (!isSelected && authorTitles.length >= 3) return
    const updated = isSelected
      ? authorTitles.filter((t) => t !== title)
      : [...authorTitles, title]
    form.setValue('authorTitles', updated)
  }

  const handleTitleOtherClick = () => {
    if (authorTitles.length >= 3) return
    setShowCustomTitleInput(true)
  }

  const handleCustomTitleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmedTitle = customTitle.trim()
      if (
        trimmedTitle &&
        !allTitles.includes(trimmedTitle) &&
        authorTitles.length < 3
      ) {
        setCustomTitles([...customTitles, trimmedTitle])
        form.setValue('authorTitles', [...authorTitles, trimmedTitle])
      }
      setCustomTitle('')
      setShowCustomTitleInput(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmitForm)}
        className='space-y-8'
      >
        {/* Keywords Section */}
        <div className='mb-8'>
          <div className='mb-4 flex items-center gap-x-6'>
            <div className='flex items-center gap-2'>
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
                    type='button'
                    key={keyword}
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
                    <span className='text-sm font-normal'>{keyword}</span>
                    {customKeywords.includes(keyword) && (
                      <button
                        type='button'
                        aria-label={`Remove ${keyword}`}
                        className='text-muted-foreground/80 hover:text-foreground transition'
                        onClick={(e) => {
                          e.stopPropagation()
                          // Remove from custom list
                          setCustomKeywords((prev) =>
                            prev.filter((k) => k !== keyword)
                          )
                          // If selected, also remove from selected keywords
                          if (form.getValues('keywords').includes(keyword)) {
                            form.setValue(
                              'keywords',
                              form
                                .getValues('keywords')
                                .filter((k) => k !== keyword)
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
                  <span className='flex items-center gap-1 text-sm font-normal'>
                    <PlusCircle className='h-4 w-4 font-normal' />
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
            {form.formState.errors.keywords?.message && (
              <p className='text-destructive flex items-center gap-1 text-sm'>
                <AlertCircle className='h-3.5 w-3.5' />
                {form.formState.errors.keywords.message as string}
              </p>
            )}
          </div>

          <div className='mt-4 flex items-center justify-between'>
            <div className='mt-1 flex items-center gap-2'>
              <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                <ExternalLink className='text-muted-foreground h-3 w-3' />
              </div>
              {selectedKeywords.length > 0 && (
                <a
                  href={liSearchUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mr-20 text-sm text-gray-500 hover:underline'
                >
                  Preview LinkedIn posts for these keywords
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Posts Per Day */}
        <div className='mb-8 flex flex-wrap gap-x-15 gap-y-8'>
          <div>
            <FormField
              control={form.control}
              name='numberOfPostsToScrapePerDay'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-foreground font-semibold'>
                    No. of posts to comment per day
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={100}
                      className='mt-2 w-32'
                      {...field}
                      onChange={(e) => {
                        const val = Math.min(
                          100,
                          Math.max(1, Number(e.target.value))
                        )
                        field.onChange(val)
                      }}
                    />
                  </FormControl>
                  <p className='text-muted-foreground mt-2 flex items-center gap-2 text-sm'>
                    <span className='border-border flex h-4 w-4 items-center justify-center rounded-full border'>
                      <Info className='text-muted-foreground h-3 w-3' />
                    </span>
                    Max. 100 posts per day
                  </p>
                  {form.formState.errors.numberOfPostsToScrapePerDay && (
                    <p className='text-destructive mt-1 flex items-center gap-1 text-sm'>
                      <AlertCircle className='h-3.5 w-3.5' />
                      {
                        form.formState.errors.numberOfPostsToScrapePerDay
                          .message as string
                      }
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* Start Time Section */}
          <div className='space-y-2'>
            <Label className='text-foreground font-semibold'>
              Select Time to Start Commenting
            </Label>
            <div className='flex items-center'>
              {/* Hour */}
              <FormField
                control={form.control}
                name='startHour'
                render={({ field }) => {
                  return (
                    <FormItem className='w-20'>
                      <SelectDropdown
                        onValueChange={(v) => {
                          if (v === '') return
                          field.onChange(v)
                        }}
                        defaultValue={field.value}
                        placeholder='Hr'
                        items={Array.from({ length: 12 }, (_, i) => ({
                          label: String(i + 1).padStart(2, '0'),
                          value: String(i + 1).padStart(2, '0'),
                        }))}
                        isControlled={true}
                      />
                      {form.formState.errors.startHour && (
                        <p className='text-destructive mt-1 flex items-center gap-1 text-xs'>
                          <AlertCircle className='h-3.5 w-3.5' />
                          {form.formState.errors.startHour.message as string}
                        </p>
                      )}
                    </FormItem>
                  )
                }}
              />

              {/* Minute */}
              <FormField
                control={form.control}
                name='startMinute'
                render={({ field }) => (
                  <FormItem className='w-24'>
                    <SelectDropdown
                      onValueChange={(v) => {
                        if (v === '') return
                        field.onChange(v)
                      }}
                      defaultValue={field.value}
                      placeholder='Min'
                      items={['00', '15', '30', '45'].map((m) => ({
                        label: m,
                        value: m,
                      }))}
                      isControlled={true}
                    />
                    {form.formState.errors.startMinute && (
                      <p className='text-destructive mt-1 flex items-center gap-1 text-xs'>
                        <AlertCircle className='h-3.5 w-3.5' />
                        {form.formState.errors.startMinute.message as string}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Period */}
              <FormField
                control={form.control}
                name='startPeriod'
                render={({ field }) => (
                  <FormItem className='w-24'>
                    <SelectDropdown
                      onValueChange={(v) => {
                        if (v === '') return
                        field.onChange(v)
                      }}
                      defaultValue={field.value}
                      placeholder='AM/PM'
                      items={['AM', 'PM'].map((p) => ({
                        label: p,
                        value: p,
                      }))}
                      isControlled={true}
                    />
                    {form.formState.errors.startPeriod && (
                      <p className='text-destructive mt-1 flex items-center gap-1 text-xs'>
                        <AlertCircle className='h-3.5 w-3.5' />
                        {form.formState.errors.startPeriod.message as string}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name='autoSchedule'
          render={({ field }) => (
            <FormItem className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-sm font-semibold'>
                  Post comments automatically
                </FormLabel>
                <FormDescription>
                  Enable to automatically schedule comments once posts are found
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Engagement Threshold */}
        <UnlockWrapper isUnlocked={shouldDisplayEngagementThresholdSetting}>
          <div className='mb-8'>
            <Label className='text-foreground font-semibold'>
              Comment Monitoring Based on Engagement
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                      <Info className='text-muted-foreground h-3 w-3' />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='right' className='max-w-xs'>
                    <p>
                      Only posts with a minimum level of engagement (e.g., at
                      least 5 likes or comments) will be considered for
                      commenting.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className='mt-3 flex flex-wrap gap-3'>
              {[
                { value: 'strict', label: 'Strict Engagement Check' },
                { value: 'moderate', label: 'Moderate Engagement Check' },
                { value: 'disabled', label: 'Comment Immediately' },
              ].map((option) => (
                <button
                  type='button'
                  key={option.value}
                  onClick={() =>
                    form.setValue('engagementThreshold', option.value as any)
                  }
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                    form.watch('engagementThreshold') === option.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <span className='text-sm font-normal'>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </UnlockWrapper>

        {/* Author Titles Section */}
        <UnlockWrapper isUnlocked={shouldDisplayAuthorTitlesSetting}>
          <div className='mb-8 space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex w-full items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <Filter className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Author Titles
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
                  {authorTitles.length}/3 titles selected
                </p>
              </div>
            </div>

            <div className='mt-4 space-y-3'>
              <div className='flex flex-wrap gap-3'>
                {allTitles.map((title) => {
                  const isSelected = authorTitles.includes(title)
                  const isDisabled = !isSelected && authorTitles.length >= 3
                  return (
                    <button
                      type='button'
                      key={title}
                      onClick={() => toggleTitle(title)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : isDisabled
                            ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      <span className='text-sm font-normal'>{title}</span>
                      {customTitles.includes(title) && (
                        <button
                          type='button'
                          aria-label={`Remove ${title}`}
                          className='text-muted-foreground/80 hover:text-foreground transition'
                          onClick={(e) => {
                            e.stopPropagation()
                            // Remove from custom titles list
                            setCustomTitles((prev) =>
                              prev.filter((t) => t !== title)
                            )
                            // If selected, also remove from selected author titles
                            if (
                              form.getValues('authorTitles').includes(title)
                            ) {
                              form.setValue(
                                'authorTitles',
                                form
                                  .getValues('authorTitles')
                                  .filter((t) => t !== title)
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
                    className='border-border bg-card text-card-foreground hover:border-primary/30 flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 hover:shadow-sm'
                  >
                    <span className='flex items-center gap-1 text-sm font-normal'>
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
              {form.formState.errors.authorTitles?.message && (
                <p className='text-destructive flex items-center gap-1 text-sm'>
                  <AlertCircle className='h-3.5 w-3.5' />
                  {form.formState.errors.authorTitles.message as string}
                </p>
              )}
            </div>
          </div>
        </UnlockWrapper>

        {/* Geography Section (multi-select) moved below Author Titles */}
        <UnlockWrapper isUnlocked={shouldDisplayGeographySetting}>
          <div>
            <div className='flex items-center gap-2'>
              <Globe className='text-muted-foreground h-4 w-4' />
              <Label className='text-foreground cursor-pointer font-medium'>
                Geography
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                      <Info className='text-muted-foreground h-3 w-3' />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='right' className='max-w-xs'>
                    <p>Select up to 6 geographic regions.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className='mt-4'>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild className='has-[>svg]:px-5'>
                  <Button variant='outline' size='sm' className='group h-9'>
                    Select regions
                    {selectedGeographies.length > 0 && (
                      <span className='text-muted-foreground ml-2 max-w-[320px] truncate text-xs'>
                        {selectedGeographies.join(', ')}
                      </span>
                    )}
                    <ChevronDown className='ml-2 size-4 group-data-[state=open]:hidden' />
                    <ChevronUp className='ml-2 hidden size-4 group-data-[state=open]:block' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-56'>
                  <DropdownMenuLabel>Regions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {['Global', 'Europe', 'Asia', 'US', 'India', 'MENA'].map(
                    (region) => (
                      <DropdownMenuCheckboxItem
                        key={region}
                        checked={selectedGeographies.includes(region)}
                        onCheckedChange={(checked) => {
                          const isChecked = !!checked
                          let updated: string[]

                          if (isChecked) {
                            if (region === 'Global') {
                              updated = ['Global']
                            } else {
                              // Remove Global if present and add the selected region
                              const withoutGlobal = selectedGeographies.filter(
                                (g) => g !== 'Global'
                              )
                              updated = withoutGlobal.includes(region)
                                ? withoutGlobal
                                : [...withoutGlobal, region]
                            }
                          } else {
                            // Unchecking removes the region
                            updated = selectedGeographies.filter(
                              (g) => g !== region
                            )
                          }

                          form.setValue('geography', updated)
                        }}
                      >
                        {region}
                      </DropdownMenuCheckboxItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </UnlockWrapper>

        {/* Skip Options */}
        <div className='mb-8 space-y-4'>
          <FormField
            control={form.control}
            name='skipHiringPosts'
            render={({ field }) => (
              <FormItem className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-sm font-semibold'>
                    Skip Hiring Posts
                  </FormLabel>
                  <FormDescription>
                    Exclude from commenting list
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='skipJobUpdatePosts'
            render={({ field }) => (
              <FormItem className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-sm font-semibold'>
                    Skip Job Update Posts
                  </FormLabel>
                  <FormDescription>
                    Exclude from commenting list
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='skipArticlePosts'
            render={({ field }) => (
              <FormItem className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-sm font-semibold'>
                    Skip Article Posts
                  </FormLabel>
                  <FormDescription>
                    Exclude from commenting list
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Additional Rules */}
        <div className='mb-8 max-w-xl'>
          <div className='mb-2 flex items-center gap-2'>
            <Label className='text-foreground font-semibold'>
              Additional Post Evaluation Rules
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
                    Specify rules to decide if a post is worth commenting on.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            placeholder='Set a rule, e.g., Skip posts with hashtags like #ad or #sponsored.'
            rows={2}
            {...form.register('rules')}
          />
        </div>

        <Button
          type='submit'
          disabled={
            isCreatingScrapeSetting ||
            isUpdatingScrapeSetting ||
            !isProfileActive
          }
        >
          {isCreatingScrapeSetting || isUpdatingScrapeSetting
            ? 'Saving...'
            : 'Save settings'}
        </Button>
      </form>
    </Form>
  )
}
