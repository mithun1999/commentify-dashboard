import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Info, MessageSquare } from 'lucide-react'
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
import { useTwitterCommentSettingQuery } from '@/features/settings/query/setting.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'

const schema = z.object({
  about: z
    .string()
    .min(10, { message: 'Profile description must be at least 10 characters.' })
    .max(500, { message: 'Profile description must be at most 500 characters.' }),
  length: z.enum(['short', 'medium', 'long']),
  turnOnEmoji: z.boolean(),
  turnOnExclamations: z.boolean(),
  turnOnHashtags: z.boolean(),
  tagAuthor: z.boolean(),
  rules: z.string().max(150).optional(),
})

type FormValues = z.infer<typeof schema>

export function TwitterCommentSettings({ profileId }: { profileId: string }) {
  const { data: profiles } = useGetAllProfileQuery()
  const profile = profiles?.find((p) => p._id === profileId)

  const { saveTwitterCommentSetting, isSavingTwitterCommentSetting } =
    useTwitterCommentSettingQuery()

  const existing = profile?.setting?.twitterCommentSetting

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      about: '',
      length: 'medium',
      turnOnEmoji: true,
      turnOnExclamations: true,
      turnOnHashtags: false,
      tagAuthor: false,
      rules: '',
    },
  })

  useEffect(() => {
    if (!profile) return
    form.reset({
      about: profile.about ?? '',
      length: existing?.length ?? CommentLengthEnum.MEDIUM,
      turnOnEmoji: existing?.turnOnEmoji ?? true,
      turnOnExclamations: existing?.turnOnExclamations ?? true,
      turnOnHashtags: existing?.turnOnHashtags ?? false,
      tagAuthor: existing?.tagAuthor ?? false,
      rules: existing?.rules ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id, existing?._id])

  function onSubmit(values: FormValues) {
    saveTwitterCommentSetting({
      ...values,
      length: values.length as CommentLengthEnum,
      about: values.about,
      profileId,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='about'
          render={({ field }) => {
            const remainingChars = Math.max(0, 500 - (field.value?.length ?? 0))
            return (
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
                          replies that match your expertise
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
                    maxLength={500}
                    {...field}
                  />
                </FormControl>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {remainingChars} characters left
                </p>
                <FormMessage>
                  {form.formState.errors.about && (
                    <div className='text-destructive flex items-center gap-2 text-sm'>
                      <AlertCircle className='h-4 w-4' />
                      {form.formState.errors.about.message}
                    </div>
                  )}
                </FormMessage>
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name='length'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply length</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select length' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='short'>Short</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='long'>Long</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className='space-y-4'>
          {(
            [
              ['turnOnEmoji', 'Emoji', 'Include emoji in replies'],
              [
                'turnOnExclamations',
                'Exclamations',
                'Use exclamation marks in replies',
              ],
              ['turnOnHashtags', 'Hashtags', 'Include relevant hashtags'],
              ['tagAuthor', 'Tag author', 'Mention the tweet author'],
            ] as const
          ).map(([name, label, desc]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                  <div>
                    <FormLabel>{label}</FormLabel>
                    <FormDescription>{desc}</FormDescription>
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
          ))}
        </div>

        <FormField
          control={form.control}
          name='rules'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional rules</FormLabel>
              <FormDescription>
                Custom instructions for the AI when generating replies.
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder='Always be supportive, never be sarcastic'
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSavingTwitterCommentSetting}>
          {isSavingTwitterCommentSetting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
