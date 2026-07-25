import { useState, useEffect } from 'react'
import { IconCheck, IconExternalLink, IconLoader2, IconPlus, IconTrash, IconSparkles, IconUsers, IconRocket, IconRefresh, IconCalendarEvent, IconMessage2, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { VoiceChatPanel } from './voice-chat-panel'
import { BrandSettingsPanel } from './brand-settings-panel'
import { MasterySignalsPanel } from './mastery-signals-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { resolvePostPlanSetting } from '@/config/plan-setting.config'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import {
  useStartOnboarding,
  useOnboardingStatus,
  useCompleteOnboarding,
  useCreators,
  useAddCreator,
  useDeleteCreator,
  usePostingPreferences,
  useUpdatePostingPreferences,
} from '../query/post-generator.query'

interface PostingOnboardingProps {
  profileId: string
  onComplete: () => void
}

function creatorDisplayName(creator: any): string {
  const name = [creator.firstName, creator.lastName].filter(Boolean).join(' ').trim()
  return name || creator.publicIdentifier || 'Unknown Creator'
}

const STEPS = [
  { id: 'analyze', label: 'Analyze Voice', icon: IconSparkles },
  { id: 'creators', label: 'Inspirational Creators', icon: IconUsers },
  { id: 'review', label: 'Launch', icon: IconRocket },
] as const

type StepId = (typeof STEPS)[number]['id']

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM',
]

function CompletedSettingsView({
  profileId,
  onboardingStatus,
  creators,
}: {
  profileId: string
  onboardingStatus: any
  creators: any[]
}) {
  const [creatorUrl, setCreatorUrl] = useState('')
  const startOnboarding = useStartOnboarding()
  const addCreator = useAddCreator()
  const deleteCreator = useDeleteCreator()
  const { data: prefs, isLoading: isLoadingPrefs } = usePostingPreferences(profileId)
  const updatePrefs = useUpdatePostingPreferences()

  const [postsPerWeek, setPostsPerWeek] = useState(3)
  const [preferredDays, setPreferredDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday'])
  const [preferredTime, setPreferredTime] = useState('09:00')
  const [activeWindowEnabled, setActiveWindowEnabled] = useState(false)
  const [prefsDirty, setPrefsDirty] = useState(false)
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)

  useEffect(() => {
    if (prefs) {
      setPostsPerWeek(prefs.postsPerWeek ?? 3)
      setPreferredDays(prefs.preferredDays ?? ['Monday', 'Wednesday', 'Friday'])
      setPreferredTime(prefs.preferredTime ?? '09:00')
      setActiveWindowEnabled(prefs.activeWindowEnabled ?? false)
      setPrefsDirty(false)
    }
  }, [prefs])

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
    setPrefsDirty(true)
  }

  const handleSavePrefs = () => {
    updatePrefs.mutate(
      { profileId, prefs: { postsPerWeek, preferredDays, preferredTime, activeWindowEnabled } },
      { onSuccess: () => setPrefsDirty(false) }
    )
  }

  const { data: user } = useGetUserQuery()
  const voice = onboardingStatus?.voiceSignature
  const maxCreators = (resolvePostPlanSetting('trackedCreators', user) as number) ?? 3
  const canAddMore = creators.length < maxCreators

  const handleAddCreator = () => {
    if (!creatorUrl.trim() || !canAddMore) return
    addCreator.mutate(
      { profileId, linkedinUrl: creatorUrl.trim() },
      { onSuccess: () => setCreatorUrl('') }
    )
  }

  const displayTime = TIME_OPTIONS.find((t) => {
    const match = preferredTime.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return t === preferredTime
    const h = parseInt(match[1], 10)
    const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
    return t === label
  }) || preferredTime

  return (
    <div className='mx-auto max-w-2xl space-y-8 py-8'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Posting Settings</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Manage your posting schedule, voice profile, and inspirational creators.
        </p>
      </div>

      <div className='space-y-6'>
        {/* Voice Profile */}
        <div className='rounded-xl border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconSparkles className='text-primary size-5' />
              <h2 className='text-lg font-semibold'>Voice Profile</h2>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => startOnboarding.mutate(profileId)}
              disabled={startOnboarding.isPending}
            >
              {startOnboarding.isPending ? (
                <IconLoader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <IconRefresh className='mr-2 size-4' />
              )}
              Re-analyze
            </Button>
          </div>

          {voice ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-muted-foreground text-xs font-medium'>Posts Analyzed</p>
                  <p className='text-sm font-medium'>
                    {voice.topPostsUsed != null && voice.totalPostsScraped != null
                      ? `Top ${voice.topPostsUsed} of ${voice.totalPostsScraped}`
                      : (voice.postsAnalyzed ?? 0)}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs font-medium'>Voice Source</p>
                  <p className='text-sm font-medium capitalize'>{voice.voiceSource ?? 'own'}</p>
                </div>
              </div>

              {voice.toneDescription && (
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>Tone</p>
                  <p className='bg-muted/50 rounded-lg p-3 text-sm leading-relaxed'>
                    {voice.toneDescription}
                  </p>
                </div>
              )}

              {voice.contentPillars?.length > 0 && (
                <div>
                  <p className='text-muted-foreground mb-2 text-xs font-medium'>Content Pillars</p>
                  <div className='flex flex-wrap gap-2'>
                    {voice.contentPillars.map((pillar: string) => (
                      <Badge key={pillar} variant='secondary'>
                        {pillar}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {voice.vocabulary?.avoidWords?.length > 0 && (
                <div>
                  <p className='text-muted-foreground mb-2 text-xs font-medium'>Words to avoid</p>
                  <div className='flex flex-wrap gap-2'>
                    {voice.vocabulary.avoidWords.map((word: string) => (
                      <Badge key={word} variant='outline'>
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className='border-t pt-4'>
                <button
                  type='button'
                  onClick={() => setVoiceChatOpen((v) => !v)}
                  className='hover:text-primary text-muted-foreground flex w-full items-center justify-between text-sm font-medium transition-colors'
                >
                  <span className='flex items-center gap-2'>
                    <IconMessage2 className='size-4' />
                    Refine with AI
                  </span>
                  {voiceChatOpen ? (
                    <IconChevronUp className='size-4' />
                  ) : (
                    <IconChevronDown className='size-4' />
                  )}
                </button>
                {voiceChatOpen && (
                  <div className='mt-3 h-[420px] overflow-hidden rounded-lg border'>
                    <VoiceChatPanel
                      profileId={profileId}
                      history={onboardingStatus?.voiceSignature?.voiceEditHistory ?? []}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              No voice profile found. Click "Re-analyze" to generate one.
            </p>
          )}
        </div>

        {/* Inspirational Creators */}
        <div className='rounded-xl border p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <IconUsers className='text-primary size-5' />
            <h2 className='text-lg font-semibold'>Inspirational Creators</h2>
            <span className='text-muted-foreground text-xs'>
              ({creators.length}/{maxCreators})
            </span>
          </div>

          {creators.length > 0 && (
            <div className='mb-4 space-y-2'>
              {creators.map((creator: any) => (
                <div
                  key={creator._id}
                  className='flex items-center justify-between rounded-lg border p-3'
                >
                  <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <Avatar className='size-9 shrink-0'>
                      {creator.profilePictureUrl ? (
                        <AvatarImage
                          src={creator.profilePictureUrl}
                          alt={creatorDisplayName(creator)}
                        />
                      ) : null}
                      <AvatarFallback className='text-xs'>
                        {(
                          creator.firstName?.[0] ||
                          creator.publicIdentifier?.[0] ||
                          '?'
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <a
                        href={`https://www.linkedin.com/in/${creator.publicIdentifier}/`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='group inline-flex items-center gap-1 text-sm font-medium hover:underline'
                      >
                        {creatorDisplayName(creator)}
                        <IconExternalLink className='text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100' />
                      </a>
                      {creator.headline ? (
                        <p className='text-muted-foreground truncate text-xs'>
                          {creator.headline}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8 shrink-0'
                    onClick={() =>
                      deleteCreator.mutate({ creatorId: creator._id, profileId })
                    }
                  >
                    <IconTrash className='size-3.5' />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {canAddMore ? (
            <div className='flex gap-2'>
              <Input
                placeholder='Paste LinkedIn profile URL...'
                value={creatorUrl}
                onChange={(e) => setCreatorUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCreator()}
                disabled={addCreator.isPending}
              />
              <Button
                variant='outline'
                size='icon'
                onClick={handleAddCreator}
                disabled={!creatorUrl.trim() || addCreator.isPending}
              >
                {addCreator.isPending ? (
                  <IconLoader2 className='size-4 animate-spin' />
                ) : (
                  <IconPlus className='size-4' />
                )}
              </Button>
            </div>
          ) : (
            <p className='text-muted-foreground text-xs'>
              Maximum of {maxCreators} creators reached.
            </p>
          )}
        </div>

        {/* What we know about you (mastery signals) */}
        <MasterySignalsPanel profileId={profileId} />

        {/* Brand for Carousels */}
        <BrandSettingsPanel profileId={profileId} />

        {/* Posting Schedule */}
        <div className='rounded-xl border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconCalendarEvent className='text-primary size-5' />
              <h2 className='text-lg font-semibold'>Posting Schedule</h2>
            </div>
            <Button
              size='sm'
              onClick={handleSavePrefs}
              disabled={!prefsDirty || updatePrefs.isPending}
            >
              {updatePrefs.isPending ? (
                <IconLoader2 className='mr-2 size-4 animate-spin' />
              ) : null}
              Save Changes
            </Button>
          </div>

          {isLoadingPrefs ? (
            <div className='space-y-5'>
              <div>
                <Skeleton className='mb-2 h-3 w-24' />
                <div className='flex items-center gap-2'>
                  <Skeleton className='size-10 rounded-lg' />
                  <Skeleton className='size-10 rounded-lg' />
                  <Skeleton className='size-10 rounded-lg' />
                </div>
              </div>
              <div>
                <Skeleton className='mb-2 h-3 w-24' />
                <div className='flex flex-wrap gap-2'>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className='h-8 w-12 rounded-lg' />
                  ))}
                </div>
              </div>
              <div>
                <Skeleton className='mb-2 h-3 w-24' />
                <Skeleton className='h-9 w-32 rounded-md' />
              </div>
            </div>
          ) : (
            <div className='space-y-5'>
              <div>
                <p className='text-muted-foreground mb-2 text-xs font-medium'>Posts Per Week</p>
                <div className='flex items-center gap-2'>
                  {[3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type='button'
                      onClick={() => { setPostsPerWeek(n); setPrefsDirty(true) }}
                      className={cn(
                        'flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                        postsPerWeek === n
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {prefs?.aiSuggested && (
                  <p className='text-muted-foreground mt-1.5 text-xs'>
                    AI recommended: {prefs.aiSuggested.postsPerWeek} posts/week
                  </p>
                )}
              </div>

              <div>
                <p className='text-muted-foreground mb-2 text-xs font-medium'>Preferred Days</p>
                <div className='flex flex-wrap gap-2'>
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      type='button'
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        preferredDays.includes(day)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className='text-muted-foreground mb-2 text-xs font-medium'>Preferred Time</p>
                <select
                  value={displayTime}
                  onChange={(e) => {
                    const val = e.target.value
                    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                    if (match) {
                      let h = parseInt(match[1], 10)
                      if (match[3].toUpperCase() === 'PM' && h < 12) h += 12
                      if (match[3].toUpperCase() === 'AM' && h === 12) h = 0
                      setPreferredTime(`${String(h).padStart(2, '0')}:00`)
                    } else {
                      setPreferredTime(val)
                    }
                    setPrefsDirty(true)
                  }}
                  className='border-input bg-background ring-offset-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2'
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className='flex items-start justify-between gap-4 border-t pt-5'>
                <div className='space-y-0.5'>
                  <p className='text-sm font-medium'>Active Window Boost</p>
                  <p className='text-muted-foreground text-xs'>
                    Auto-comment on relevant posts for 30 min before and after
                    each scheduled post to look active when it goes live. Comments
                    are shifted from your daily quota, not added on top.
                  </p>
                  {prefs && !prefs.commentingConfigured && (
                    <p className='text-amber-600 dark:text-amber-500 mt-1 text-xs font-medium'>
                      Requires the Commenting agent — set up your target keywords
                      and comment style first.
                    </p>
                  )}
                </div>
                <Switch
                  checked={activeWindowEnabled && !!prefs?.commentingConfigured}
                  disabled={!prefs?.commentingConfigured}
                  onCheckedChange={(checked) => {
                    setActiveWindowEnabled(checked)
                    setPrefsDirty(true)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PostingOnboarding({ profileId, onComplete }: PostingOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<StepId>('analyze')
  const [creatorUrl, setCreatorUrl] = useState('')

  const startOnboarding = useStartOnboarding()
  const { data: onboardingStatus, isLoading: isLoadingStatus } = useOnboardingStatus(profileId)
  const completeOnboarding = useCompleteOnboarding()
  const { data: creators = [] } = useCreators(profileId)
  const addCreator = useAddCreator()
  const deleteCreator = useDeleteCreator()

  const voiceData = startOnboarding.data || onboardingStatus?.voiceSignature
  const postsAnalyzed = voiceData?.postsAnalyzed ?? 0
  const hasAnalyzed = !!voiceData
  const creatorsRequired = postsAnalyzed === 0 && hasAnalyzed

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)

  const { data: user } = useGetUserQuery()

  const handleAnalyze = () => {
    startOnboarding.mutate(profileId)
  }

  const maxCreators = (resolvePostPlanSetting('trackedCreators', user) as number) ?? 3
  const canAddMore = creators.length < maxCreators

  const handleAddCreator = () => {
    if (!creatorUrl.trim() || !canAddMore) return
    addCreator.mutate(
      { profileId, linkedinUrl: creatorUrl.trim() },
      { onSuccess: () => setCreatorUrl('') }
    )
  }

  const handleComplete = async () => {
    await completeOnboarding.mutateAsync(profileId)
    onComplete()
  }

  const canProceedFromAnalyze = hasAnalyzed
  const canProceedFromCreators = !creatorsRequired || creators.length > 0

  if (isLoadingStatus) {
    return (
      <div className='mx-auto max-w-3xl space-y-6 py-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-9 w-32 rounded-md' />
        </div>
        <div className='flex items-center gap-2'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-8 w-32 rounded-md' />
          ))}
        </div>
        <div className='space-y-3 rounded-xl border p-6'>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
          <Skeleton className='h-4 w-3/4' />
        </div>
      </div>
    )
  }

  if (onboardingStatus?.completed) {
    return (
      <CompletedSettingsView
        profileId={profileId}
        onboardingStatus={onboardingStatus}
        creators={creators}
      />
    )
  }

  return (
    <div className='mx-auto max-w-2xl py-8'>
      <div className='mb-8 text-center'>
        <h1 className='text-2xl font-bold tracking-tight'>Set up your Posting Agent</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Let's analyze your writing style and preferences to create content that sounds like you.
        </p>
      </div>

      {/* Step indicators */}
      <div className='mb-10 flex items-center justify-center gap-2'>
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStep
          const isCompleted = i < currentStepIndex
          const StepIcon = step.icon

          return (
            <div key={step.id} className='flex items-center gap-2'>
              {i > 0 && (
                <div
                  className={cn(
                    'h-px w-8',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              <button
                type='button'
                onClick={() => {
                  if (isCompleted) setCurrentStep(step.id)
                }}
                disabled={!isCompleted && !isActive}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive && 'border-primary bg-primary/5 text-primary',
                  isCompleted && 'border-primary/50 text-primary cursor-pointer',
                  !isActive && !isCompleted && 'text-muted-foreground cursor-default'
                )}
              >
                {isCompleted ? (
                  <IconCheck className='size-3.5' />
                ) : (
                  <StepIcon className='size-3.5' />
                )}
                {step.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className='rounded-xl border p-6'>
        {currentStep === 'analyze' && (
          <div className='space-y-6'>
            <div>
              <h2 className='text-lg font-semibold'>Analyze Your Writing Voice</h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                We'll scan your recent LinkedIn posts to understand your tone, vocabulary, content themes, and posting patterns.
              </p>
            </div>

            {!hasAnalyzed ? (
              <Button onClick={handleAnalyze} disabled={startOnboarding.isPending} size='lg' className='w-full'>
                {startOnboarding.isPending ? (
                  <>
                    <IconLoader2 className='mr-2 size-4 animate-spin' />
                    Analyzing your posts...
                  </>
                ) : (
                  <>
                    <IconSparkles className='mr-2 size-4' />
                    Analyze My Voice
                  </>
                )}
              </Button>
            ) : (
              <div className='space-y-4'>
                <div className='bg-muted/50 rounded-lg p-4'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h3 className='text-sm font-medium'>Analysis Complete</h3>
                    <Badge variant='secondary'>{postsAnalyzed} posts analyzed</Badge>
                  </div>

                  {postsAnalyzed === 0 && (
                    <p className='text-sm text-amber-600'>
                      No posts found on your profile. You'll need to add inspirational creators so we can learn
                      from their writing style instead.
                    </p>
                  )}

                  {postsAnalyzed > 0 && voiceData?.toneDescription && (
                    <div className='space-y-3'>
                      <div>
                        <p className='text-muted-foreground text-xs font-medium'>Tone</p>
                        <p className='text-sm'>{voiceData.toneDescription}</p>
                      </div>
                      {voiceData.contentPillars?.length > 0 && (
                        <div>
                          <p className='text-muted-foreground mb-1 text-xs font-medium'>Content Pillars</p>
                          <div className='flex flex-wrap gap-1.5'>
                            {voiceData.contentPillars.map((pillar: string) => (
                              <Badge key={pillar} variant='outline' className='text-xs'>
                                {pillar}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className='flex justify-end'>
                  <Button onClick={() => setCurrentStep('creators')} disabled={!canProceedFromAnalyze}>
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'creators' && (
          <div className='space-y-6'>
            <div>
              <h2 className='text-lg font-semibold'>Add Inspirational Creators</h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                {creatorsRequired
                  ? 'Since we couldn\'t find posts on your profile, add at least one creator whose style you admire. We\'ll use their posts to build your voice profile.'
                  : 'Optionally add LinkedIn creators whose post structure and format you admire. Their patterns will influence your generated content.'}
              </p>
              {creatorsRequired && (
                <Badge variant='destructive' className='mt-2 text-xs'>
                  Required — at least 1 creator needed
                </Badge>
              )}
            </div>

            {canAddMore ? (
              <div className='flex gap-2'>
                <Input
                  placeholder='Paste LinkedIn profile URL...'
                  value={creatorUrl}
                  onChange={(e) => setCreatorUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCreator()}
                  disabled={addCreator.isPending}
                />
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleAddCreator}
                  disabled={!creatorUrl.trim() || addCreator.isPending}
                >
                  {addCreator.isPending ? (
                    <IconLoader2 className='size-4 animate-spin' />
                  ) : (
                    <IconPlus className='size-4' />
                  )}
                </Button>
              </div>
            ) : (
              <p className='text-muted-foreground text-xs'>
                Maximum of {maxCreators} creators reached.
              </p>
            )}

            {creators.length > 0 && (
              <div className='space-y-2'>
                {creators.map((creator: any) => (
                  <div
                    key={creator._id}
                    className='flex items-center justify-between rounded-lg border p-3'
                  >
                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                      <Avatar className='size-9 shrink-0'>
                        {creator.profilePictureUrl ? (
                          <AvatarImage src={creator.profilePictureUrl} alt={creatorDisplayName(creator)} />
                        ) : null}
                        <AvatarFallback className='text-xs'>
                          {(creator.firstName?.[0] || creator.publicIdentifier?.[0] || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <a
                          href={`https://www.linkedin.com/in/${creator.publicIdentifier}/`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='group inline-flex items-center gap-1 text-sm font-medium hover:underline'
                        >
                          {creatorDisplayName(creator)}
                          <IconExternalLink className='text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100' />
                        </a>
                        {creator.headline ? (
                          <p className='text-muted-foreground truncate text-xs'>
                            {creator.headline}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 shrink-0'
                      onClick={() =>
                        deleteCreator.mutate({
                          creatorId: creator._id,
                          profileId,
                        })
                      }
                    >
                      <IconTrash className='size-3.5' />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className='flex justify-between'>
              <Button variant='ghost' onClick={() => setCurrentStep('analyze')}>
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep('review')}
                disabled={!canProceedFromCreators}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className='space-y-6'>
            <div>
              <h2 className='text-lg font-semibold'>Ready to Launch</h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                Here's a summary of your setup. Once you proceed, you'll have access to your content calendar, posting history, and settings.
              </p>
            </div>

            <div className='space-y-3'>
              <div className='bg-muted/50 flex items-center gap-3 rounded-lg p-3'>
                <IconSparkles className='text-primary size-5 shrink-0' />
                <div>
                  <p className='text-sm font-medium'>Voice Profile</p>
                  <p className='text-muted-foreground text-xs'>
                    {postsAnalyzed > 0
                      ? `Based on ${postsAnalyzed} of your posts`
                      : `Will be seeded from ${creators.length} creator(s)`}
                  </p>
                </div>
              </div>

              {creators.length > 0 && (
                <div className='bg-muted/50 flex items-center gap-3 rounded-lg p-3'>
                  <IconUsers className='text-primary size-5 shrink-0' />
                  <div>
                    <p className='text-sm font-medium'>Inspirational Creators</p>
                    <p className='text-muted-foreground text-xs'>
                      {creators.length} creator(s) added for structural patterns
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className='flex justify-between'>
              <Button variant='ghost' onClick={() => setCurrentStep('creators')}>
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completeOnboarding.isPending}
                size='lg'
              >
                {completeOnboarding.isPending ? (
                  <>
                    <IconLoader2 className='mr-2 size-4 animate-spin' />
                    Setting up...
                  </>
                ) : (
                  <>
                    <IconRocket className='mr-2 size-4' />
                    Complete Setup
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
