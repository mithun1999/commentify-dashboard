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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useUpdateOnboardingStatus } from '@/features/auth/query/user.query'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'

export function IdentityStep() {
  const posthog = usePostHog()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const identitySchema = z.object({
    heardFrom: z.string().min(1, 'Please select how you heard about us'),
  })
  type IdentityValues = z.infer<typeof identitySchema>

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { heardFrom: '' },
  })

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
                          'Founder community',
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <OnboardingNavigation
              nextStep='/'
              nextLabel='Finish'
              loading={isUpdatingOnboardingStatus}
              onNext={async () => {
                const isValid = await form.trigger()
                if (!isValid) return false
                const values = form.getValues()
                try {
                  posthog?.capture('onboarding_identity_submitted', {
                    heardFrom: values.heardFrom,
                  })
                  await updateOnboardingStatusAsync({
                    status: 'completed',
                    step: 5,
                    heardFrom: values.heardFrom,
                  })
                  return true
                } catch {
                  return false
                }
              }}
              currentStep='identity'
            />
          </OnboardingCard>
        </div>
      </form>
    </Form>
  )
}
