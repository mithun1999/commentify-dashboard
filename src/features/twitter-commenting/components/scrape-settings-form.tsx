import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Info,
  PlusCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SelectDropdown } from '@/components/select-dropdown'
import {
  Hour12,
  MinuteQuarter,
  Period,
  toPaddedHourAndPeriod,
  toQuarterMinute,
  toUTCFromLocalSelection,
  wallTimeInZoneToLocal,
} from '@/lib/date.utils'
import { useTwitterScrapeSettingQuery } from '@/features/settings/query/setting.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'

const predefinedKeywords = [
  'AI',
  'SaaS',
  'Startup',
  'Marketing',
  'Sales',
  'Leadership',
  'Finance',
  'Growth',
]

const schema = z.object({
  anyOfTheseWords: z.array(z.string()).max(6),
  allOfTheseWords: z.array(z.string()).max(6),
  thisExactPhrase: z.string().max(100).optional(),
  noneOfTheseWords: z.array(z.string()).max(6),
  theseHashtags: z.array(z.string()).max(6),
  language: z.string(),
  numberOfPostsToScrapePerDay: z.number().min(1).max(100),
  autoSchedule: z.boolean(),
  engagementThreshold: z.enum(['strict', 'moderate', 'disabled']),
  startHour: z.enum([
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12',
  ]) as z.ZodType<Hour12>,
  startMinute: z.enum(['00', '15', '30', '45']) as z.ZodType<MinuteQuarter>,
  startPeriod: z.enum(['AM', 'PM']) as z.ZodType<Period>,
})

type FormValues = z.infer<typeof schema>

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
]

export function TwitterScrapeSettings({ profileId }: { profileId: string }) {
  const { data: profiles } = useGetAllProfileQuery()
  const profile = profiles?.find((p) => p._id === profileId)

  const { saveTwitterScrapeSetting, isSavingTwitterScrapeSetting } =
    useTwitterScrapeSettingQuery()

  const existing = profile?.setting?.twitterScrapeSetting

  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [customKeywords, setCustomKeywords] = useState<string[]>([])
  const [excludeInput, setExcludeInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      anyOfTheseWords: [],
      allOfTheseWords: [],
      thisExactPhrase: '',
      noneOfTheseWords: [],
      theseHashtags: [],
      language: 'en',
      numberOfPostsToScrapePerDay: 20,
      autoSchedule: true,
      engagementThreshold: 'disabled',
      startHour: '09',
      startMinute: '00',
      startPeriod: 'AM',
    },
    shouldUnregister: false,
    mode: 'onSubmit',
  })

  useEffect(() => {
    if (!existing) return

    const existingKeywords = existing.anyOfTheseWords ?? []
    const extraKeywords = existingKeywords.filter(
      (k) => !predefinedKeywords.includes(k)
    )
    if (extraKeywords.length) setCustomKeywords(extraKeywords)

    let paddedHour: Hour12 = '09'
    let minute: MinuteQuarter = '00'
    let period: Period = 'AM'

    if (existing.jobTiming) {
      const { hours24, minutes } = wallTimeInZoneToLocal(
        existing.jobTiming.hours,
        existing.jobTiming.minutes,
        'UTC'
      )
      const hp = toPaddedHourAndPeriod(hours24)
      paddedHour = (hp.hour || '09').padStart(2, '0') as Hour12
      const q = toQuarterMinute(minutes)
      minute = (['00', '15', '30', '45'].includes(q) ? q : '00') as MinuteQuarter
      period = hp.period === 'AM' || hp.period === 'PM' ? hp.period : 'AM'
    }

    form.reset({
      anyOfTheseWords: existingKeywords,
      allOfTheseWords: existing.allOfTheseWords ?? [],
      thisExactPhrase: existing.thisExactPhrase ?? '',
      noneOfTheseWords: existing.noneOfTheseWords ?? [],
      theseHashtags: existing.theseHashtags ?? [],
      language: existing.language ?? 'en',
      numberOfPostsToScrapePerDay: existing.numberOfPostsToScrapePerDay ?? 20,
      autoSchedule: existing.autoSchedule ?? true,
      engagementThreshold: existing.engagementThreshold ?? 'disabled',
      startHour: paddedHour,
      startMinute: minute,
      startPeriod: period,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id])

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const selectedKeywords = form.watch('anyOfTheseWords') || []

  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      form.setValue(
        'anyOfTheseWords',
        selectedKeywords.filter((k) => k !== keyword)
      )
    } else if (selectedKeywords.length < 6) {
      form.setValue('anyOfTheseWords', [...selectedKeywords, keyword])
    }
  }

  const handleCustomKeywordSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = customKeyword.trim()
      if (trimmed && !allKeywords.includes(trimmed) && selectedKeywords.length < 6) {
        setCustomKeywords([...customKeywords, trimmed])
        form.setValue('anyOfTheseWords', [...selectedKeywords, trimmed])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  function onSubmit(values: FormValues) {
    const { hours, minutes } = toUTCFromLocalSelection(
      values.startHour as any,
      values.startMinute as any,
      values.startPeriod as any
    )

    saveTwitterScrapeSetting({
      anyOfTheseWords: values.anyOfTheseWords,
      allOfTheseWords: values.allOfTheseWords,
      thisExactPhrase: values.thisExactPhrase || undefined,
      noneOfTheseWords: values.noneOfTheseWords,
      theseHashtags: values.theseHashtags,
      language: values.language,
      numberOfPostsToScrapePerDay: values.numberOfPostsToScrapePerDay,
      autoSchedule: values.autoSchedule,
      engagementThreshold: values.engagementThreshold,
      jobTiming: { hours, minutes },
      profileId,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Keywords (any of these words) */}
        <div>
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
                      Select keywords related to your niche. Tweets matching
                      any of these keywords will be scraped.
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
                          setCustomKeywords((prev) =>
                            prev.filter((k) => k !== keyword)
                          )
                          if (form.getValues('anyOfTheseWords').includes(keyword)) {
                            form.setValue(
                              'anyOfTheseWords',
                              form.getValues('anyOfTheseWords').filter((k) => k !== keyword)
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
                  onClick={() => setShowCustomKeywordInput(true)}
                  disabled={selectedKeywords.length >= 6}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                    selectedKeywords.length >= 6
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                      : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <span className='flex items-center gap-1 text-sm font-normal'>
                    <PlusCircle className='h-4 w-4' />
                    Other
                  </span>
                </button>
              ) : (
                <Input
                  placeholder='Enter keyword...'
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  onKeyDown={handleCustomKeywordSubmit}
                  onBlur={() => setShowCustomKeywordInput(false)}
                  autoFocus
                  className='h-10 w-32'
                />
              )}
            </div>
            {form.formState.errors.anyOfTheseWords?.message && (
              <p className='text-destructive flex items-center gap-1 text-sm'>
                <AlertCircle className='h-3.5 w-3.5' />
                {form.formState.errors.anyOfTheseWords.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Advanced keyword filters */}
        <div className='space-y-4'>
          <FormField
            control={form.control}
            name='thisExactPhrase'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exact phrase</FormLabel>
                <FormDescription>
                  Only scrape tweets containing this exact phrase.
                </FormDescription>
                <FormControl>
                  <Input placeholder='"machine learning"' {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='noneOfTheseWords'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exclude words</FormLabel>
                <FormDescription>
                  Tweets containing these words will be skipped.
                </FormDescription>
                <div className='flex flex-wrap gap-2'>
                  {field.value.map((word) => (
                    <span
                      key={word}
                      className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                    >
                      {word}
                      <button
                        type='button'
                        onClick={() =>
                          field.onChange(field.value.filter((w) => w !== word))
                        }
                        className='text-primary/60 hover:text-primary transition'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </span>
                  ))}
                  {field.value.length < 6 && (
                    <Input
                      placeholder='e.g. spam, hiring…'
                      value={excludeInput}
                      onChange={(e) => setExcludeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = excludeInput.trim()
                          if (trimmed && !field.value.includes(trimmed)) {
                            field.onChange([...field.value, trimmed])
                          }
                          setExcludeInput('')
                        }
                      }}
                      className='h-9 w-44'
                    />
                  )}
                </div>
                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <span className='border-border flex h-4 w-4 shrink-0 items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </span>
                  Type a word and press Enter to add.
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='theseHashtags'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hashtags to target</FormLabel>
                <FormDescription>
                  Only scrape tweets containing these hashtags.
                </FormDescription>
                <div className='flex flex-wrap gap-2'>
                  {field.value.map((tag) => (
                    <span
                      key={tag}
                      className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                    >
                      #{tag}
                      <button
                        type='button'
                        onClick={() =>
                          field.onChange(field.value.filter((t) => t !== tag))
                        }
                        className='text-primary/60 hover:text-primary transition'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </span>
                  ))}
                  {field.value.length < 6 && (
                    <Input
                      placeholder='e.g. buildinpublic'
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = hashtagInput.trim().replace(/^#/, '')
                          if (trimmed && !field.value.includes(trimmed)) {
                            field.onChange([...field.value, trimmed])
                          }
                          setHashtagInput('')
                        }
                      }}
                      className='h-9 w-44'
                    />
                  )}
                </div>
                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <span className='border-border flex h-4 w-4 shrink-0 items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </span>
                  Type a hashtag and press Enter to add.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Posts per day + Start time + Language */}
        <div className='flex flex-wrap gap-x-15 gap-y-8'>
          <div>
            <FormField
              control={form.control}
              name='numberOfPostsToScrapePerDay'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-foreground font-semibold'>
                    No. of tweets to comment per day
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={100}
                      className='mt-2 w-32'
                      {...field}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(1, Number(e.target.value)))
                        field.onChange(val)
                      }}
                    />
                  </FormControl>
                  <p className='text-muted-foreground mt-2 flex items-center gap-2 text-sm'>
                    <span className='border-border flex h-4 w-4 items-center justify-center rounded-full border'>
                      <Info className='text-muted-foreground h-3 w-3' />
                    </span>
                    Max. 100 tweets per day
                  </p>
                </FormItem>
              )}
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-foreground font-semibold'>
              Select Time to Start Commenting
            </Label>
            <div className='flex items-center'>
              <FormField
                control={form.control}
                name='startHour'
                render={({ field }) => (
                  <FormItem className='w-20'>
                    <SelectDropdown
                      onValueChange={(v) => { if (v) field.onChange(v) }}
                      defaultValue={field.value}
                      placeholder='Hr'
                      items={Array.from({ length: 12 }, (_, i) => ({
                        label: String(i + 1).padStart(2, '0'),
                        value: String(i + 1).padStart(2, '0'),
                      }))}
                      isControlled={true}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='startMinute'
                render={({ field }) => (
                  <FormItem className='w-24'>
                    <SelectDropdown
                      onValueChange={(v) => { if (v) field.onChange(v) }}
                      defaultValue={field.value}
                      placeholder='Min'
                      items={['00', '15', '30', '45'].map((m) => ({
                        label: m,
                        value: m,
                      }))}
                      isControlled={true}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='startPeriod'
                render={({ field }) => (
                  <FormItem className='w-24'>
                    <SelectDropdown
                      onValueChange={(v) => { if (v) field.onChange(v) }}
                      defaultValue={field.value}
                      placeholder='AM/PM'
                      items={['AM', 'PM'].map((p) => ({
                        label: p,
                        value: p,
                      }))}
                      isControlled={true}
                    />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <FormField
              control={form.control}
              name='language'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-foreground font-semibold'>
                    Language
                  </FormLabel>
                  <div className='w-36'>
                    <SelectDropdown
                      onValueChange={(v) => { if (v) field.onChange(v) }}
                      defaultValue={field.value}
                      placeholder='Language'
                      items={languageOptions}
                      isControlled={true}
                    />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Auto-schedule */}
        <FormField
          control={form.control}
          name='autoSchedule'
          render={({ field }) => (
            <FormItem className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-sm font-semibold'>
                  Post replies automatically
                </FormLabel>
                <FormDescription>
                  Enable to automatically schedule replies once tweets are found
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
        <div>
          <Label className='text-foreground font-semibold'>
            Engagement Threshold
          </Label>
          <p className='text-muted-foreground mb-3 text-sm'>
            Filter tweets based on their engagement level before replying.
          </p>
          <div className='flex flex-wrap gap-3'>
            {[
              { value: 'strict', label: 'Strict Engagement Check' },
              { value: 'moderate', label: 'Moderate Engagement Check' },
              { value: 'disabled', label: 'Reply Immediately' },
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

        <Button type='submit' disabled={isSavingTwitterScrapeSetting}>
          {isSavingTwitterScrapeSetting ? 'Saving...' : 'Save settings'}
        </Button>
      </form>
    </Form>
  )
}
