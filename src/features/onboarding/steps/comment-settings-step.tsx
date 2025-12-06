'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  MessageSquare,
  Settings,
  Smile,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useProfileStore } from '@/stores/profile.store'
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
import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'
import { ICreateOnboardingCommentDto } from '../interface/onboarding.interface'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useCreateOnboardingCommentQuery } from '../query/onboarding.query'

const commentSettingsSchema = z.object({
  aboutProfile: z
    .string()
    .min(10, 'Profile description must be at least 10 characters')
    .max(500, 'Profile description must be less than 500 characters'),
  commentStyle: z.enum(['short', 'medium', 'long']),
  commentsPerDay: z
    .number()
    .min(0, 'Comments per day must be at least 0')
    .max(100, 'Comments per day must be at most 100'),
  useEmojis: z.boolean(),
  useExclamations: z.boolean(),
})

type CommentSettingsValues = z.infer<typeof commentSettingsSchema>

const defaultValues: CommentSettingsValues = {
  aboutProfile: '',
  commentStyle: 'medium',
  commentsPerDay: 10,
  useEmojis: true,
  useExclamations: true,
}

export function CommentSettingsStep() {
  const posthog = usePostHog()
  const [isStylePreferencesExpanded, setIsStylePreferencesExpanded] =
    useState(false)
  const [isCommentSettingsExpanded, setIsCommentSettingsExpanded] =
    useState(false)

  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { createOnboardingCommentSettingAsync, isCreatingOnboardingComment } =
    useCreateOnboardingCommentQuery()

  const form = useForm<CommentSettingsValues>({
    resolver: zodResolver(commentSettingsSchema),
    defaultValues,
    mode: 'onChange',
  })

  // Form values are now handled by FormField components

  const onSubmit = async (data: CommentSettingsValues) => {
    if (!activeProfile?._id) return

    const payload: ICreateOnboardingCommentDto = {
      aboutProfile: data.aboutProfile,
      length: data.commentStyle as CommentLengthEnum,
      commentsPerDay: data.commentsPerDay,
      turnOnEmoji: data.useEmojis,
      turnOnExclamations: data.useExclamations,
    }

    try {
      await createOnboardingCommentSettingAsync({
        profileId: activeProfile._id,
        data: payload,
      })
      posthog?.capture('onboarding_comment_setting_form_submitted', {
        commentStyle: data.commentStyle,
        commentsPerDay: data.commentsPerDay,
        useEmojis: data.useEmojis,
        useExclamations: data.useExclamations,
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
          title='Comment Generation Settings'
          description='Configure how your automated comments will be generated and styled.'
        >
          <div className='mb-8 space-y-6'>
            {/* About Profile Section */}
            <FormField
              control={form.control}
              name='aboutProfile'
              render={({ field }) => {
                const remainingChars = Math.max(
                  0,
                  500 - (field.value?.length ?? 0)
                )
                return (
                  <FormItem className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='text-muted-foreground h-4 w-4' />
                    <FormLabel className='text-foreground font-medium'>
                      About Your Profile
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
                            Describe your background to help generate
                            <br />
                            comments that match your expertise
                            <br />
                            and professional voice
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder='Describe your professional background, expertise, and interests to help generate relevant comments'
                      className='focus-visible:ring-primary bg-card border-border text-card-foreground min-h-[120px] focus-visible:ring-2 focus-visible:ring-offset-2'
                      {...field}
                    />
                  </FormControl>
                  <span className='text-muted-foreground text-xs'>
                    This helps our AI understand your voice and expertise
                  </span>
                    <p className='text-muted-foreground text-xs'>
                      {remainingChars} characters left
                    </p>
                  <FormMessage>
                    {form.formState.errors.aboutProfile && (
                      <div className='text-destructive flex items-center gap-2 text-sm'>
                        <AlertCircle className='h-4 w-4' />
                        {form.formState.errors.aboutProfile.message}
                      </div>
                    )}
                  </FormMessage>
                  </FormItem>
                )
              }}
            />

            {/* Comment Settings Row - Collapsible */}
            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() =>
                  setIsCommentSettingsExpanded(!isCommentSettingsExpanded)
                }
              >
                <div className='flex items-center gap-2'>
                  <Settings className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Comment Settings
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
                          Control the length of generated comments and <br />
                          Set your preferred daily comment volume.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                  {isCommentSettingsExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>

              {isCommentSettingsExpanded && (
                <div className='grid grid-cols-1 gap-6 pt-4 md:grid-cols-2'>
                  {/* Comment Size */}
                  <FormField
                    control={form.control}
                    name='commentStyle'
                    render={({ field }) => (
                      <FormItem className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <FormLabel className='text-foreground font-medium'>
                            Comment Size
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
                                  Control the length of generated comments.
                                  <br />
                                  Shorter comments tend to get more engagement
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className='focus-visible:ring-primary bg-card border-border text-card-foreground focus-visible:ring-2 focus-visible:ring-offset-2'>
                              <SelectValue placeholder='Select comment style' />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Comments Per Day */}
                  <FormField
                    control={form.control}
                    name='commentsPerDay'
                    render={({ field }) => (
                      <FormItem className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <Calendar className='text-muted-foreground h-4 w-4' />
                          <FormLabel className='text-foreground font-medium'>
                            Comments Per Day
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
                                  Set your preferred daily comment volume.
                                  <br />
                                  Higher numbers increase engagement
                                  <br />
                                  but may appear less authentic
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            max={100}
                            className='focus-visible:ring-primary bg-card border-border text-card-foreground focus-visible:ring-2 focus-visible:ring-offset-2'
                            {...field}
                            onChange={(e) => {
                              const val = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              )
                              field.onChange(val)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Style Preferences - Collapsible */}
            <div className='space-y-2'>
              <div
                className='group flex cursor-pointer items-center justify-between'
                onClick={() =>
                  setIsStylePreferencesExpanded(!isStylePreferencesExpanded)
                }
              >
                <div className='flex items-center gap-2'>
                  <Smile className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground cursor-pointer font-medium'>
                    Style Preferences
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
                          Customize the tone and style of your
                          <br />
                          automated comments for better
                          <br />
                          alignment with your brand
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
                  {isStylePreferencesExpanded ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </div>
              </div>

              {isStylePreferencesExpanded && (
                <div className='grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2'>
                  {/* Emojis Toggle Card */}
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
                              Include relevant emojis in comments
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

                  {/* Exclamations Toggle Card */}
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
          </div>

          <OnboardingNavigation
            nextStep='/onboarding/identity'
            loading={isCreatingOnboardingComment}
            onNext={async () => {
              const isValid = await form.trigger()
              if (!isValid) return false

              const values = form.getValues()
              const result = await onSubmit(values)
              return Boolean(result)
            }}
            currentStep='comment_settings'
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
