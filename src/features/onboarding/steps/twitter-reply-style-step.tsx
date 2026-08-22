'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  MessageSquare,
  Settings,
  Smile,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUpdateOnboardingStatus } from '@/features/auth/query/user.query'
import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useTrackStepView } from '../hooks/useTrackStepView'
import { useCreateOnboardingCommentQuery } from '../query/onboarding.query'

const ABOUT_MAX = 500

const schema = z.object({
  aboutProfile: z
    .string()
    .min(10, 'Tell us at least a sentence about yourself')
    .max(ABOUT_MAX, `Keep this under ${ABOUT_MAX} characters`),
  replyStyle: z.enum(['short', 'medium', 'long']),
  repliesPerDay: z
    .number()
    .min(0, 'Replies per day must be at least 0')
    .max(100, 'Replies per day must be at most 100'),
  useEmojis: z.boolean(),
  useExclamations: z.boolean(),
})

type ReplyStyleValues = z.infer<typeof schema>

const defaultValues: ReplyStyleValues = {
  aboutProfile: '',
  replyStyle: 'medium',
  repliesPerDay: 10,
  useEmojis: true,
  useExclamations: true,
}

export function TwitterReplyStyleStep() {
  useTrackStepView('comment-settings')

  const posthog = usePostHog()
  const [isStyleExpanded, setIsStyleExpanded] = useState(false)
  const [isReplySettingsExpanded, setIsReplySettingsExpanded] = useState(false)

  const { data: onboardingData, markStepCompleted } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const resolvedProfileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id

  const { createOnboardingCommentSettingAsync, isCreatingOnboardingComment } =
    useCreateOnboardingCommentQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const form = useForm<ReplyStyleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      aboutProfile:
        onboardingData.commentSetting?.aboutProfile ||
        defaultValues.aboutProfile,
    },
    mode: 'onChange',
  })

  const save = async (data: ReplyStyleValues) => {
    posthog?.capture('onboarding_comment_setting_form_submitted', {
      platform: 'twitter',
      commentStyle: data.replyStyle,
      commentsPerDay: data.repliesPerDay,
      useEmojis: data.useEmojis,
      useExclamations: data.useExclamations,
    })

    if (!resolvedProfileId) {
      toast.error(
        'No connected profile found. Please go back and connect your account first.'
      )
      return false
    }

    try {
      await createOnboardingCommentSettingAsync({
        profileId: resolvedProfileId,
        data: {
          aboutProfile: data.aboutProfile,
          length: data.replyStyle as CommentLengthEnum,
          commentsPerDay: data.repliesPerDay,
          turnOnEmoji: data.useEmojis,
          turnOnExclamations: data.useExclamations,
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
          title='How your replies should sound'
          description='This is what your agent draws on when it writes in your name.'
        >
          <div className='mb-8 space-y-6'>
            <FormField
              control={form.control}
              name='aboutProfile'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='text-muted-foreground h-4 w-4' />
                    <FormLabel className='text-foreground font-medium'>
                      About You
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                            <Info className='text-muted-foreground h-3 w-3' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side='right' className='max-w-xs'>
                          <p>
                            Your background is what lets a reply sound like it
                            came from you rather than from anyone.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder='What you do, what you know well, and what you like talking about.'
                      className='focus-visible:ring-primary bg-card border-border text-card-foreground min-h-[120px] focus-visible:ring-2 focus-visible:ring-offset-2'
                      {...field}
                    />
                  </FormControl>
                  <p className='text-muted-foreground text-xs'>
                    {Math.max(0, ABOUT_MAX - (field.value?.length ?? 0))}{' '}
                    characters left
                  </p>
                  <FormMessage>
                    {form.formState.errors.aboutProfile && (
                      <span className='text-destructive flex items-center gap-2 text-sm'>
                        <AlertCircle className='h-4 w-4' />
                        {form.formState.errors.aboutProfile.message}
                      </span>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />

            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() =>
                  setIsReplySettingsExpanded(!isReplySettingsExpanded)
                }
              >
                <div className='flex items-center gap-2'>
                  <Settings className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Reply Settings
                  </Label>
                  <span className='text-muted-foreground text-xs'>
                    Length and daily volume
                  </span>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                  {isReplySettingsExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>

              {isReplySettingsExpanded && (
                <div className='grid grid-cols-1 gap-6 pt-4 md:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='replyStyle'
                    render={({ field }) => (
                      <FormItem className='space-y-3'>
                        <FormLabel className='text-foreground font-medium'>
                          Reply Length
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className='focus-visible:ring-primary bg-card border-border text-card-foreground focus-visible:ring-2 focus-visible:ring-offset-2'>
                              <SelectValue placeholder='Select reply length' />
                            </SelectTrigger>
                            <SelectContent className='bg-popover border-border'>
                              <SelectItem value='short'>
                                Short (10 words)
                              </SelectItem>
                              <SelectItem value='medium'>
                                Medium (15 words)
                              </SelectItem>
                              <SelectItem value='long'>
                                Long (25 words)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className='text-muted-foreground text-xs'>
                          Shorter replies tend to get more engagement.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='repliesPerDay'
                    render={({ field }) => (
                      <FormItem className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <Calendar className='text-muted-foreground h-4 w-4' />
                          <FormLabel className='text-foreground font-medium'>
                            Replies Per Day
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            max={100}
                            className='focus-visible:ring-primary bg-card border-border text-card-foreground focus-visible:ring-2 focus-visible:ring-offset-2'
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value))
                                )
                              )
                            }
                          />
                        </FormControl>
                        <p className='text-muted-foreground text-xs'>
                          Higher volume reaches more people but reads as less
                          personal.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() => setIsStyleExpanded(!isStyleExpanded)}
              >
                <div className='flex items-center gap-2'>
                  <Smile className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Style Preferences
                  </Label>
                  <span className='text-muted-foreground text-xs'>
                    Emojis and exclamations
                  </span>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                  {isStyleExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>

              {isStyleExpanded && (
                <div className='grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='useEmojis'
                    render={({ field }) => (
                      <FormItem>
                        <div className='border-border bg-card flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-sm'>
                          <div className='space-y-1'>
                            <FormLabel className='text-card-foreground text-sm font-medium'>
                              Use Emojis
                            </FormLabel>
                            <p className='text-muted-foreground text-xs'>
                              Include relevant emojis in replies
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
                    name='useExclamations'
                    render={({ field }) => (
                      <FormItem>
                        <div className='border-border bg-card flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-sm'>
                          <div className='space-y-1'>
                            <FormLabel className='text-card-foreground text-sm font-medium'>
                              Use Exclamations
                            </FormLabel>
                            <p className='text-muted-foreground text-xs'>
                              Add emphasis with exclamation points
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
              )}
            </div>

            <p className='text-muted-foreground text-xs'>
              You can change any of this from Settings later.
            </p>
          </div>

          <OnboardingNavigation
            prevStep='/onboarding/post-settings'
            nextStep='/onboarding/identity'
            currentStep='comment-settings'
            loading={isCreatingOnboardingComment || isUpdatingOnboardingStatus}
            onNext={async () => {
              if (!(await form.trigger())) return false
              if (!(await save(form.getValues()))) return false

              markStepCompleted('comment-settings')
              await updateOnboardingStatusAsync({
                status: 'in-progress',
                stepKey: 'identity',
              })
              return true
            }}
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
