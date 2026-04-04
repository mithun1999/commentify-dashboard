// import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePostHog } from 'posthog-js/react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
// import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'
import { useTrackStepView } from '../hooks/useTrackStepView'

export function IdentityStep() {
  useTrackStepView('identity')
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const isPending = user?.status === UserSubscriptionStatus.PENDING

  const identitySchema = z.object({
    heardFrom: z.string().min(1, 'Please select how you heard about us'),
    otherDetails: z.string().optional(),
  })
  type IdentityValues = z.infer<typeof identitySchema>

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { heardFrom: '', otherDetails: '' },
  })

  const handleSubmitAndNext = async (): Promise<boolean> => {
    const isValid = await form.trigger()
    if (!isValid) return false
    const values = form.getValues()
    try {
      const other = (values.otherDetails ?? '').trim()
      const heardFromValue =
        values.heardFrom === 'Other'
          ? other
            ? `Other - ${other}`
            : 'Other'
          : values.heardFrom

      posthog?.capture('onboarding_identity_submitted', {
        heardFrom: heardFromValue,
      })
      await updateOnboardingStatusAsync({
        status: isPending ? 'in-progress' : 'completed',
        step: isPending ? 6 : 5,
        heardFrom: heardFromValue,
      })
      return true
    } catch {
      return false
    }
  }

  return (
    <Form {...form}>
      <form>
        <div className='space-y-8'>
          <OnboardingCard
            title='Final Step: Share where you found us 🎉'
            description='Almost there! One last step to help us tailor Commentify to your goals.'
          >
            <div className='grid gap-8'>
              <FormField
                control={form.control}
                name='heardFrom'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <FormLabel className='text-foreground font-medium'>
                        How did you hear about us?
                      </FormLabel>
                    </div>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className='grid gap-4 sm:grid-cols-2'
                      >
                        {[
                          'LinkedIn',
                          'AI Marketplaces',
                          'Twitter / Facebook / YouTube',
                          'Friend / Colleague',
                          'Google Search',
                          'Founder / Slack community',
                          'Other',
                        ].map((option) => (
                          <label
                            key={option}
                            className='border-border bg-card hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors'
                          >
                            <RadioGroupItem value={option} />
                            <span className='text-sm font-medium'>
                              {option}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {field.value === 'Other' && (
                      <FormField
                        control={form.control}
                        name='otherDetails'
                        render={({ field: otherField }) => (
                          <FormItem className='space-y-3'>
                            <FormLabel className='text-foreground font-medium'>
                              Where else did you find us?
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder='e.g., Reddit, ProductHunt, newsletter, etc.'
                                className='focus-visible:ring-primary bg-card border-border text-card-foreground focus-visible:ring-2 focus-visible:ring-offset-2'
                                {...otherField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <OnboardingNavigation
              nextStep={isPending ? '/onboarding/activate-trial' : '/'}
              nextLabel={isPending ? 'Continue' : 'Finish'}
              loading={isUpdatingOnboardingStatus}
              onNext={handleSubmitAndNext}
              currentStep='identity'
            />
          </OnboardingCard>
        </div>
      </form>
    </Form>
  )
}
