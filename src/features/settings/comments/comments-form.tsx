'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { planSetting } from '@/config/plan-setting.config'
import {
  MessageSquare,
  Settings,
  Smile,
  Info,
  Hash,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import { useProfileStore } from '@/stores/profile.store'
// import { showSubmittedData } from '@/utils/show-submitted-data'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'
import {
  useCreateCommentSettingQuery,
  useUpdateCommentSettingQuery,
} from '@/features/settings/query/setting.query'

const commentSettingsSchema = z.object({
  about: z.string().min(10, {
    message: 'Profile description must be at least 10 characters.',
  }),
  length: z.enum(['short', 'medium', 'long']),
  turnOnEmoji: z.boolean(),
  turnOnExclamations: z.boolean(),
  turnOnHashtags: z.boolean(),
  tagAuthor: z.boolean(),
  rules: z.string().optional(),
})

type CommentSettingsValues = z.infer<typeof commentSettingsSchema>

const defaultValues: Partial<CommentSettingsValues> = {
  about: '',
  length: 'medium',
  turnOnEmoji: true,
  turnOnExclamations: true,
  turnOnHashtags: false,
  tagAuthor: false,
  rules: '',
}

export function CommentsForm({ prev }: { prev?: () => void }) {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: user } = useGetUserQuery()
  const userPlan =
    (user?.subscribedProduct?.name?.toLowerCase() as
      | 'starter'
      | 'pro'
      | 'premium') ?? 'starter'
  const { createCommentSetting, isCreatingCommentSetting } =
    useCreateCommentSettingQuery()
  const { updateCommentSetting, isUpdatingCommentSetting } =
    useUpdateCommentSettingQuery()

  const shouldDisplayTagAuthorSetting = Boolean(
    planSetting['tagAuthor']?.[userPlan]
  )
  const shouldDisplayCommentRulesSetting = Boolean(
    planSetting['commentRules']?.[userPlan]
  )

  const form = useForm<CommentSettingsValues>({
    resolver: zodResolver(commentSettingsSchema),
    defaultValues,
  })

  const populateCommentSettingData = () => {
    const existingCommentSetting = activeProfile?.setting?.commentSetting
    if (existingCommentSetting) {
      const valuesNow = form.getValues()
      form.reset({
        about: activeProfile?.about ?? valuesNow.about,
        length: (existingCommentSetting as any)?.length ?? valuesNow.length,
        turnOnEmoji:
          typeof existingCommentSetting.turnOnEmoji === 'boolean'
            ? existingCommentSetting.turnOnEmoji
            : valuesNow.turnOnEmoji,
        turnOnExclamations:
          typeof existingCommentSetting.turnOnExclamations === 'boolean'
            ? existingCommentSetting.turnOnExclamations
            : valuesNow.turnOnExclamations,
        turnOnHashtags:
          typeof existingCommentSetting.turnOnHashtags === 'boolean'
            ? existingCommentSetting.turnOnHashtags
            : valuesNow.turnOnHashtags,
        tagAuthor:
          typeof existingCommentSetting.tagAuthor === 'boolean'
            ? existingCommentSetting.tagAuthor
            : valuesNow.tagAuthor,
        rules: existingCommentSetting.rules ?? valuesNow.rules,
      })
    }
  }

  useEffect(() => {
    populateCommentSettingData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.setting])

  const onSubmit = (data: CommentSettingsValues) => {
    if (!activeProfile?._id) return
    const plan = (userPlan ?? 'starter') as 'starter' | 'pro' | 'premium'

    const existingCommentSetting = activeProfile?.setting?.commentSetting

    const payload = {
      profileId: activeProfile._id,
      userPlan: plan,
      turnOnEmoji: data.turnOnEmoji,
      turnOnExclamations: data.turnOnExclamations,
      turnOnHashtags: data.turnOnHashtags,
      tagAuthor: data?.tagAuthor ?? false,
      length: data.length as CommentLengthEnum,
      rules: data.rules,
    }

    const hasExisting = Boolean(existingCommentSetting?._id)
    if (hasExisting) {
      updateCommentSetting(payload)
    } else {
      createCommentSetting(payload)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Profile Info */}

        {/* About Profile Section */}
        <FormField
          control={form.control}
          name='about'
          render={({ field }) => (
            <FormItem>
              <div className='mb-2 flex items-center gap-2'>
                <MessageSquare className='text-muted-foreground h-4 w-4' />
                <FormLabel className='text-foreground font-semibold'>
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
                  placeholder="I'm a digital marketer... I help people... I've helped 50+ founders to... After many failures, I learned that..."
                  className='min-h-[80px]'
                  {...field}
                />
              </FormControl>
              <FormMessage>
                {form.formState.errors.about && (
                  <div className='text-destructive flex items-center gap-2 text-sm'>
                    <AlertCircle className='h-4 w-4' />
                    {form.formState.errors.about.message}
                  </div>
                )}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Comment Settings Section */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Settings className='text-muted-foreground h-4 w-4' />
            <h3 className='text-lg font-medium'>Comment Settings</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>
                    Control the length of generated comments and
                    <br />
                    set your preferred daily comment volume
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className='mb-8'>
            {/* Comment Length */}
            <FormField
              control={form.control}
              name='length'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment Length</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select comment length' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='short'>Short (10 words)</SelectItem>
                      <SelectItem value='medium'>Medium (15 words)</SelectItem>
                      <SelectItem value='long'>Long (25 words)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage>
                    {form.formState.errors.length && (
                      <div className='text-destructive flex items-center gap-2 text-sm'>
                        <AlertCircle className='h-4 w-4' />
                        {form.formState.errors.length.message}
                      </div>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>
          <div>
            {/* Additional Rules Section */}
            {shouldDisplayCommentRulesSetting && (
              <FormField
                control={form.control}
                name='rules'
                render={({ field }) => (
                  <FormItem>
                    <div className='mb-2 flex items-center gap-2'>
                      <Hash className='text-muted-foreground h-4 w-4' />
                      <FormLabel className='text-foreground font-semibold'>
                        Additional Comment Generation Rules
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
                              Write additional rules to customize
                              <br />
                              how comments should be generated
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Write additional rules, e.g., Avoid phrases like 'Great post' or 'Nice work."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.rules && (
                        <div className='text-destructive flex items-center gap-2 text-sm'>
                          <AlertCircle className='h-4 w-4' />
                          {form.formState.errors.rules.message}
                        </div>
                      )}
                    </FormMessage>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Writer Settings Section */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Smile className='text-muted-foreground h-4 w-4' />
            <h3 className='text-lg font-medium'>Writer Settings</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>Customize the tone and style of your automated comments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='turnOnEmoji'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Turn on emoji</FormLabel>
                    <FormDescription>
                      Include relevant emojis in comments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  {form.formState.errors.turnOnEmoji && (
                    <div className='text-destructive mt-2 flex items-center gap-2 text-sm'>
                      <AlertCircle className='h-4 w-4' />
                      {form.formState.errors.turnOnEmoji.message}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='turnOnExclamations'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      Turn on exclamations
                    </FormLabel>
                    <FormDescription>
                      Add emphasis with exclamation points
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  {form.formState.errors.turnOnExclamations && (
                    <div className='text-destructive mt-2 flex items-center gap-2 text-sm'>
                      <AlertCircle className='h-4 w-4' />
                      {form.formState.errors.turnOnExclamations.message}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='turnOnHashtags'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      Turn on hashtags
                    </FormLabel>
                    <FormDescription>
                      Include relevant hashtags in comments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  {form.formState.errors.turnOnHashtags && (
                    <div className='text-destructive mt-2 flex items-center gap-2 text-sm'>
                      <AlertCircle className='h-4 w-4' />
                      {form.formState.errors.turnOnHashtags.message}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {shouldDisplayTagAuthorSetting && (
              <FormField
                control={form.control}
                name='tagAuthor'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        Tag Post Author
                      </FormLabel>
                      <FormDescription>
                        Mention the author in your comments
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    {form.formState.errors.tagAuthor && (
                      <div className='text-destructive mt-2 flex items-center gap-2 text-sm'>
                        <AlertCircle className='h-4 w-4' />
                        {form.formState.errors.tagAuthor.message}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className='flex justify-between'>
          {prev && (
            <Button variant='outline' onClick={prev} className='gap-2'>
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
          )}
          <Button
            type='submit'
            disabled={isCreatingCommentSetting || isUpdatingCommentSetting}
          >
            {isCreatingCommentSetting || isUpdatingCommentSetting
              ? 'Saving...'
              : 'Update settings'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
