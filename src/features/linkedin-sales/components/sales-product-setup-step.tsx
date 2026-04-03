'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Globe,
  Loader2,
  Sparkles,
  PlusCircle,
  X,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { useOnboarding } from '@/stores/onboarding.store'
import {
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { OnboardingNavigation } from '@/features/onboarding/onboarding-navigation'
import { useExtractFromWebsite } from '../query/sales.query'

const salesProductSchema = z.object({
  websiteUrl: z.string().url('Please enter a valid URL').or(z.literal('')),
  productDescription: z
    .string()
    .min(10, 'Product description must be at least 10 characters')
    .max(500, 'Product description must be less than 500 characters'),
  painPoints: z
    .array(z.string())
    .min(1, 'Add at least one pain point'),
  valuePropositions: z
    .array(z.string())
    .min(1, 'Add at least one value proposition'),
})

type SalesProductValues = z.infer<typeof salesProductSchema>

export function SalesProductSetupStep() {
  const posthog = usePostHog()
  const { data: onboardingData, updateData, markStepCompleted } =
    useOnboarding()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()
  const { extractAsync, isExtracting } = useExtractFromWebsite()

  const [urlInput, setUrlInput] = useState(
    onboardingData.salesSetting.websiteUrl
  )
  const [painPointInput, setPainPointInput] = useState('')
  const [valuePropInput, setValuePropInput] = useState('')

  const form = useForm<SalesProductValues>({
    resolver: zodResolver(salesProductSchema),
    defaultValues: {
      websiteUrl: onboardingData.salesSetting.websiteUrl,
      productDescription: onboardingData.salesSetting.productDescription,
      painPoints: onboardingData.salesSetting.painPoints,
      valuePropositions: onboardingData.salesSetting.valuePropositions,
    },
    mode: 'onChange',
  })

  const { watch, setValue } = form
  const painPoints = watch('painPoints')
  const valuePropositions = watch('valuePropositions')

  const handleExtract = async () => {
    if (!urlInput.trim()) return
    try {
      const result = await extractAsync(urlInput.trim())
      if (result) {
        setValue('websiteUrl', urlInput.trim())
        if (result.productDescription) {
          setValue('productDescription', result.productDescription)
        }
        if (result.painPoints?.length) {
          setValue('painPoints', result.painPoints.slice(0, 6))
        }
        if (result.valuePropositions?.length) {
          setValue('valuePropositions', result.valuePropositions.slice(0, 5))
        }
        updateData({
          salesSetting: {
            ...onboardingData.salesSetting,
            websiteUrl: urlInput.trim(),
            productDescription: result.productDescription || '',
            painPoints: result.painPoints?.slice(0, 6) || [],
            valuePropositions: result.valuePropositions?.slice(0, 5) || [],
            suggestedJobTitles: result.suggestedJobTitles?.slice(0, 6) || [],
          },
        })
        posthog?.capture('onboarding_sales_website_extracted', {
          painPointsCount: result.painPoints?.length,
          valuePropsCount: result.valuePropositions?.length,
        })
      }
    } catch {
      // Error handled by the query hook's onError
    }
  }

  const addPainPoint = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !painPoints.includes(trimmed) && painPoints.length < 6) {
      setValue('painPoints', [...painPoints, trimmed])
    }
    setPainPointInput('')
  }

  const addValueProp = (value: string) => {
    const trimmed = value.trim()
    if (
      trimmed &&
      !valuePropositions.includes(trimmed) &&
      valuePropositions.length < 5
    ) {
      setValue('valuePropositions', [...valuePropositions, trimmed])
    }
    setValuePropInput('')
  }

  return (
    <Form {...form}>
      <form>
        <OnboardingCard
          title='Describe your product'
          description='Tell us about your product so we can find the right conversations to engage in.'
        >
          <div className='space-y-6'>
            {/* Website URL extraction */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Globe className='text-muted-foreground h-4 w-4' />
                <Label className='text-foreground font-medium'>
                  Website URL
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
                        Enter your website URL and we'll auto-fill
                        <br />
                        your product details using AI
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className='flex gap-2'>
                <Input
                  placeholder='https://yourproduct.com'
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className='flex-1'
                  disabled={isExtracting}
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleExtract}
                  disabled={isExtracting || !urlInput.trim()}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className='mr-2 h-4 w-4' />
                      Auto-fill
                    </>
                  )}
                </Button>
              </div>
              {isExtracting && (
                <p className='text-muted-foreground text-xs'>
                  Analyzing your website... this may take 10-15 seconds.
                </p>
              )}
            </div>

            {/* Product Description */}
            <FormField
              control={form.control}
              name='productDescription'
              render={({ field }) => {
                const remaining = Math.max(0, 500 - (field.value?.length ?? 0))
                return (
                  <FormItem className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <Lightbulb className='text-muted-foreground h-4 w-4' />
                      <FormLabel className='text-foreground font-medium'>
                        Product Description
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder='Describe what your product does and who it serves...'
                        className='min-h-[100px]'
                        {...field}
                      />
                    </FormControl>
                    <p className='text-muted-foreground text-xs'>
                      {remaining} characters left
                    </p>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {/* Pain Points */}
            <div className='space-y-2'>
              <div className='flex items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <ShieldAlert className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground font-medium'>
                    Pain Points Your Product Solves
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
                          These are used to find relevant posts
                          <br />
                          and generate search keywords
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className='text-muted-foreground text-sm'>
                  {painPoints.length}/6
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {painPoints.map((pp) => (
                  <span
                    key={pp}
                    className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                  >
                    {pp}
                    <button
                      type='button'
                      onClick={() =>
                        setValue(
                          'painPoints',
                          painPoints.filter((p) => p !== pp)
                        )
                      }
                      className='hover:text-primary/70 transition'
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  </span>
                ))}
                {painPoints.length < 6 && (
                  <div className='flex items-center gap-1'>
                    <Input
                      placeholder='Add a pain point...'
                      value={painPointInput}
                      onChange={(e) => setPainPointInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addPainPoint(painPointInput)
                        }
                      }}
                      className='h-9 w-48'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => addPainPoint(painPointInput)}
                      disabled={!painPointInput.trim()}
                    >
                      <PlusCircle className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
              {form.formState.errors.painPoints && (
                <p className='text-destructive text-sm'>
                  {form.formState.errors.painPoints.message}
                </p>
              )}
            </div>

            {/* Value Propositions */}
            <div className='space-y-2'>
              <div className='flex items-center gap-x-6'>
                <div className='flex items-center gap-2'>
                  <Sparkles className='text-muted-foreground h-4 w-4' />
                  <Label className='text-foreground font-medium'>
                    Value Propositions
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
                          Key benefits that differentiate your product.
                          <br />
                          Used to craft compelling comments.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className='text-muted-foreground text-sm'>
                  {valuePropositions.length}/5
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {valuePropositions.map((vp) => (
                  <span
                    key={vp}
                    className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
                  >
                    {vp}
                    <button
                      type='button'
                      onClick={() =>
                        setValue(
                          'valuePropositions',
                          valuePropositions.filter((v) => v !== vp)
                        )
                      }
                      className='hover:text-primary/70 transition'
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  </span>
                ))}
                {valuePropositions.length < 5 && (
                  <div className='flex items-center gap-1'>
                    <Input
                      placeholder='Add a value proposition...'
                      value={valuePropInput}
                      onChange={(e) => setValuePropInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addValueProp(valuePropInput)
                        }
                      }}
                      className='h-9 w-52'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => addValueProp(valuePropInput)}
                      disabled={!valuePropInput.trim()}
                    >
                      <PlusCircle className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
              {form.formState.errors.valuePropositions && (
                <p className='text-destructive text-sm'>
                  {form.formState.errors.valuePropositions.message}
                </p>
              )}
            </div>
          </div>

          <OnboardingNavigation
            prevStep='/onboarding/connect-account'
            nextStep='/onboarding/comment-settings'
            loading={isUpdatingOnboardingStatus}
            onNext={async () => {
              const isValid = await form.trigger()
              if (!isValid) return false

              const values = form.getValues()
              updateData({
                salesSetting: {
                  ...onboardingData.salesSetting,
                  websiteUrl: values.websiteUrl || '',
                  productDescription: values.productDescription,
                  painPoints: values.painPoints,
                  valuePropositions: values.valuePropositions,
                },
              })

              posthog?.capture('onboarding_sales_product_setup_completed', {
                painPointsCount: values.painPoints.length,
                valuePropsCount: values.valuePropositions.length,
                hasWebsite: !!values.websiteUrl,
              })

              markStepCompleted('post-settings')
              await updateOnboardingStatusAsync({
                status: 'in-progress',
                step: 4,
              })
              return true
            }}
            currentStep='post-settings'
          />
        </OnboardingCard>
      </form>
    </Form>
  )
}
