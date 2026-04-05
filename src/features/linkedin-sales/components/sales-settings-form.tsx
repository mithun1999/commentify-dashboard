'use client'

import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Globe,
  Loader2,
  Sparkles,
  PlusCircle,
  X,
  ShieldAlert,
  Lightbulb,
  Target,
  Filter,
  Users,
  Swords,
  HandshakeIcon,
  Megaphone,
  Info,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile.store'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { useCreateSalesSetting, useExtractFromWebsite } from '../query/sales.query'
import {
  MonitoredProfiles,
  type MonitoredProfilesHandle,
} from '@/features/linkedin-commenting/components/monitored-profiles'

const PITCH_OPTIONS = [
  {
    value: 'subtle' as const,
    label: 'Subtle',
    description: 'Add value first, mention product only when naturally relevant',
    icon: HandshakeIcon,
  },
  {
    value: 'moderate' as const,
    label: 'Moderate',
    description: 'Weave product mentions into helpful commentary',
    icon: Megaphone,
  },
  {
    value: 'direct' as const,
    label: 'Direct',
    description: "Lead with how your product solves the post's problem",
    icon: Target,
  },
]

const salesSettingsSchema = z.object({
  websiteUrl: z.string().url('Please enter a valid URL').or(z.literal('')),
  productDescription: z
    .string()
    .min(10, 'Product description must be at least 10 characters')
    .max(500, 'Max 500 characters'),
  painPoints: z.array(z.string()).min(1, 'Add at least one pain point'),
  valuePropositions: z.array(z.string()).min(1, 'Add at least one value proposition'),
  pitchIntensity: z.enum(['subtle', 'moderate', 'direct']),
  matchMode: z.enum(['strict', 'flexible']),
  suggestedJobTitles: z.array(z.string()).max(6),
  competitorNames: z.array(z.string()),
})

type SalesSettingsValues = z.infer<typeof salesSettingsSchema>

export function SalesSettingsForm({ profileId }: { profileId: string }) {
  const monitoredRef = useRef<MonitoredProfilesHandle>(null)
  const { data: profiles } = useGetAllProfileQuery()
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const { createSalesSettingAsync, isCreatingSalesSetting } = useCreateSalesSetting()
  const { extractAsync, isExtracting } = useExtractFromWebsite()

  const profile = profiles?.find((p) => p._id === profileId)
  const existingSalesSetting = profile?.setting?.salesSetting

  useEffect(() => {
    if (profile) setActiveProfile(profile)
  }, [profileId, profile, setActiveProfile])

  const [urlInput, setUrlInput] = useState(existingSalesSetting?.websiteUrl ?? '')
  const [painPointInput, setPainPointInput] = useState('')
  const [valuePropInput, setValuePropInput] = useState('')
  const [jobTitleInput, setJobTitleInput] = useState('')
  const [competitorInput, setCompetitorInput] = useState('')

  const form = useForm<SalesSettingsValues>({
    resolver: zodResolver(salesSettingsSchema),
    defaultValues: {
      websiteUrl: existingSalesSetting?.websiteUrl ?? '',
      productDescription: existingSalesSetting?.productDescription ?? '',
      painPoints: existingSalesSetting?.painPoints ?? [],
      valuePropositions: existingSalesSetting?.valuePropositions ?? [],
      pitchIntensity: existingSalesSetting?.pitchIntensity ?? 'moderate',
      matchMode: existingSalesSetting?.matchMode ?? 'flexible',
      suggestedJobTitles:
        (profile?.setting?.scrapeSetting?.authorTitlesToTarget as string[]) ?? [],
      competitorNames: existingSalesSetting?.competitorNames ?? [],
    },
  })

  const { watch, setValue } = form
  const painPoints = watch('painPoints')
  const valuePropositions = watch('valuePropositions')
  const pitchIntensity = watch('pitchIntensity')
  const matchMode = watch('matchMode')
  const suggestedJobTitles = watch('suggestedJobTitles')
  const competitorNames = watch('competitorNames')

  const handleExtract = async () => {
    if (!urlInput.trim()) return
    try {
      const result = await extractAsync(urlInput.trim())
      if (result) {
        setValue('websiteUrl', urlInput.trim())
        if (result.productDescription) setValue('productDescription', result.productDescription)
        if (result.painPoints?.length) setValue('painPoints', result.painPoints.slice(0, 6))
        if (result.valuePropositions?.length) setValue('valuePropositions', result.valuePropositions.slice(0, 5))
        if (result.suggestedJobTitles?.length) setValue('suggestedJobTitles', result.suggestedJobTitles.slice(0, 6))
        toast.success('Product details extracted successfully')
      }
    } catch {
      // handled by hook
    }
  }

  const onSubmit = async (data: SalesSettingsValues) => {
    try {
      const result = await createSalesSettingAsync({
        profileId,
        data: {
          websiteUrl: data.websiteUrl,
          productDescription: data.productDescription,
          painPoints: data.painPoints,
          valuePropositions: data.valuePropositions,
          pitchIntensity: data.pitchIntensity,
          matchMode: data.matchMode,
          competitorNames: data.competitorNames,
          suggestedJobTitles: data.suggestedJobTitles,
        },
      })

      monitoredRef.current?.save()

      const invalidKws = (result as { _invalidKeywords?: string[] })?._invalidKeywords
      if (invalidKws?.length) {
        toast.warning(
          `Some keywords couldn't be validated: ${invalidKws.join(', ')}. Your pain points may need refinement.`
        )
      }
    } catch {
      // handled by hook
    }
  }

  const addTag = (
    field: 'painPoints' | 'valuePropositions' | 'suggestedJobTitles' | 'competitorNames',
    value: string,
    max?: number
  ) => {
    const trimmed = value.trim()
    const current = form.getValues(field)
    if (trimmed && !current.includes(trimmed) && (!max || current.length < max)) {
      setValue(field, [...current, trimmed])
    }
  }

  const removeTag = (
    field: 'painPoints' | 'valuePropositions' | 'suggestedJobTitles' | 'competitorNames',
    value: string
  ) => {
    setValue(
      field,
      form.getValues(field).filter((v) => v !== value)
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Website URL */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Globe className='text-muted-foreground h-4 w-4' />
            <Label className='font-medium'>Website URL</Label>
          </div>
          <div className='flex gap-2'>
            <Input
              placeholder='https://yourproduct.com'
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className='flex-1'
              disabled={isExtracting}
            />
            <Button type='button' variant='outline' onClick={handleExtract} disabled={isExtracting || !urlInput.trim()}>
              {isExtracting ? (
                <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Extracting...</>
              ) : (
                <><Sparkles className='mr-2 h-4 w-4' />Re-extract</>
              )}
            </Button>
          </div>
        </div>

        {/* Product Description */}
        <FormField
          control={form.control}
          name='productDescription'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center gap-2'>
                <Lightbulb className='text-muted-foreground h-4 w-4' />
                <FormLabel className='font-medium'>Product Description</FormLabel>
              </div>
              <FormControl>
                <Textarea placeholder='Describe what your product does...' className='min-h-[100px]' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pain Points */}
        <TagSection
          label='Pain Points'
          icon={<ShieldAlert className='text-muted-foreground h-4 w-4' />}
          tooltip='Used to find relevant posts and generate search keywords'
          items={painPoints}
          max={6}
          inputValue={painPointInput}
          onInputChange={setPainPointInput}
          onAdd={(v) => { addTag('painPoints', v, 6); setPainPointInput('') }}
          onRemove={(v) => removeTag('painPoints', v)}
          placeholder='Add a pain point...'
          error={form.formState.errors.painPoints?.message}
        />

        {/* Value Propositions */}
        <TagSection
          label='Value Propositions'
          icon={<Sparkles className='text-muted-foreground h-4 w-4' />}
          tooltip='Key benefits used to craft compelling comments'
          items={valuePropositions}
          max={5}
          inputValue={valuePropInput}
          onInputChange={setValuePropInput}
          onAdd={(v) => { addTag('valuePropositions', v, 5); setValuePropInput('') }}
          onRemove={(v) => removeTag('valuePropositions', v)}
          placeholder='Add a value proposition...'
          error={form.formState.errors.valuePropositions?.message}
        />

        {/* Pitch Intensity */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Target className='text-muted-foreground h-4 w-4' />
            <Label className='font-medium'>Pitch Intensity</Label>
          </div>
          <div className='grid gap-2'>
            {PITCH_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = pitchIntensity === option.value
              return (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setValue('pitchIntensity', option.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                    isSelected ? 'ring-primary border-primary bg-primary/5 ring-1' : 'hover:bg-muted/50 border-border'
                  )}
                >
                  <Icon className={cn('size-5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>{option.label}</span>
                    <p className='text-muted-foreground text-xs'>{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Match Mode */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Filter className='text-muted-foreground h-4 w-4' />
            <Label className='font-medium'>Match Strictness</Label>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {(['strict', 'flexible'] as const).map((m) => (
              <button
                key={m}
                type='button'
                onClick={() => setValue('matchMode', m)}
                className={cn(
                  'rounded-lg border px-4 py-3 text-left transition-all',
                  matchMode === m ? 'ring-primary border-primary bg-primary/5 ring-1' : 'hover:bg-muted/50 border-border'
                )}
              >
                <span className={cn('text-sm font-medium capitalize', matchMode === m && 'text-primary')}>{m}</span>
                <p className='text-muted-foreground text-xs'>
                  {m === 'strict' ? 'High relevance posts only' : 'Broader reach, more conversations'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <MonitoredProfiles ref={monitoredRef} profileId={profileId} />

        {/* Target Job Titles */}
        <TagSection
          label='Target Job Titles'
          icon={<Users className='text-muted-foreground h-4 w-4' />}
          tooltip="Job titles of your ideal customers. We'll prioritize posts from these people."
          items={suggestedJobTitles}
          max={6}
          inputValue={jobTitleInput}
          onInputChange={setJobTitleInput}
          onAdd={(v) => { addTag('suggestedJobTitles', v, 6); setJobTitleInput('') }}
          onRemove={(v) => removeTag('suggestedJobTitles', v)}
          placeholder='e.g. CTO, VP Engineering...'
        />

        {/* Competitors */}
        <TagSection
          label='Competitors'
          icon={<Swords className='text-muted-foreground h-4 w-4' />}
          tooltip='Name competitors so the agent can engage in comparison discussions'
          items={competitorNames}
          inputValue={competitorInput}
          onInputChange={setCompetitorInput}
          onAdd={(v) => { addTag('competitorNames', v); setCompetitorInput('') }}
          onRemove={(v) => removeTag('competitorNames', v)}
          placeholder='Add competitor...'
        />

        <Button type='submit' disabled={isCreatingSalesSetting}>
          {isCreatingSalesSetting ? (
            <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Saving...</>
          ) : (
            'Save Sales Settings'
          )}
        </Button>
      </form>
    </Form>
  )
}

function TagSection({
  label,
  icon,
  tooltip,
  items,
  max,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  error,
}: {
  label: string
  icon: React.ReactNode
  tooltip: string
  items: string[]
  max?: number
  inputValue: string
  onInputChange: (v: string) => void
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder: string
  error?: string
}) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-x-6'>
        <div className='flex items-center gap-2'>
          {icon}
          <Label className='font-medium'>{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                  <Info className='text-muted-foreground h-3 w-3' />
                </div>
              </TooltipTrigger>
              <TooltipContent side='right' className='max-w-xs'>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {max && (
          <p className='text-muted-foreground text-sm'>
            {items.length}/{max}
          </p>
        )}
      </div>
      <div className='flex flex-wrap gap-2'>
        {items.map((item) => (
          <span
            key={item}
            className='bg-primary/10 border-primary text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm'
          >
            {item}
            <button type='button' onClick={() => onRemove(item)} className='hover:text-primary/70 transition'>
              <X className='h-3.5 w-3.5' />
            </button>
          </span>
        ))}
        {(!max || items.length < max) && (
          <div className='flex items-center gap-1'>
            <Input
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onAdd(inputValue)
                }
              }}
              className='h-9 w-48'
            />
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => onAdd(inputValue)}
              disabled={!inputValue.trim()}
            >
              <PlusCircle className='h-4 w-4' />
            </Button>
          </div>
        )}
      </div>
      {error && <p className='text-destructive text-sm'>{error}</p>}
    </div>
  )
}
