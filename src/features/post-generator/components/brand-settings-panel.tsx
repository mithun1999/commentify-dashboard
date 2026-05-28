import { useEffect, useMemo, useState } from 'react'
import {
  IconPalette,
  IconLoader2,
  IconRefresh,
  IconCheck,
  IconSparkles,
  IconMoodSmile,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  useBrandSettings,
  useUpdateBrandSettings,
  useRederiveBrandSettings,
} from '../query/post-generator.query'
import type {
  BrandSettings,
  CarouselStyleKey,
  BrandBackgroundMode,
} from '../api/post-generator.api'

interface BrandSettingsPanelProps {
  profileId: string
}

interface StyleMeta {
  key: CarouselStyleKey
  label: string
  vibe: string
  /** Two demo swatches the gallery card shows so users see palette + accent. */
  demoSwatches: (b: BrandSettings['colors']) => { bg: string; chip: string; ink: string }
}

const STYLE_META: StyleMeta[] = [
  {
    key: 'gradient_modern',
    label: 'Gradient Modern',
    vibe: 'Linear / Vercel — soft gradients, 3D objects',
    demoSwatches: (b) => ({ bg: `${b.primary}15`, chip: b.accent, ink: b.primary }),
  },
  {
    key: 'editorial_quote',
    label: 'Editorial Quote',
    vibe: 'Bold serif + oversized quote marks',
    demoSwatches: (b) => ({
      bg: b.background === 'dark' ? '#1c1917' : '#faf6f0',
      chip: b.accent,
      ink: b.background === 'dark' ? '#fafafa' : '#0c0a09',
    }),
  },
  {
    key: 'hand_drawn',
    label: 'Hand-drawn',
    vibe: 'Sketched notebook page',
    demoSwatches: (b) => ({
      bg: b.background === 'dark' ? '#1c1917' : '#fdf6e3',
      chip: b.accent,
      ink: b.primary,
    }),
  },
  {
    key: 'tabloid_breaking',
    label: 'Tabloid Breaking',
    vibe: 'Bold tabloid front page, BREAKING badges',
    demoSwatches: (b) => ({ bg: '#ffffff', chip: b.primary, ink: '#0a0a0a' }),
  },
  {
    key: 'minimalist_blue',
    label: 'Minimalist',
    vibe: 'Apple keynote / generous whitespace',
    demoSwatches: (b) => ({
      bg: b.background === 'dark' ? '#0c0c0e' : '#f7fafc',
      chip: b.accent,
      ink: b.primary,
    }),
  },
  {
    key: 'vintage_print',
    label: 'Vintage Print',
    vibe: '1960s editorial print, halftone',
    demoSwatches: (b) => ({ bg: '#f5efe0', chip: b.accent, ink: b.primary }),
  },
]

const BG_MODES: { value: BrandBackgroundMode; label: string }[] = [
  { value: 'cream', label: 'Cream' },
  { value: 'white', label: 'White' },
  { value: 'dark', label: 'Dark' },
]

const HEX_RX = /^#[0-9a-fA-F]{6}$/

export function BrandSettingsPanel({ profileId }: BrandSettingsPanelProps) {
  const { data, isLoading } = useBrandSettings(profileId)
  const update = useUpdateBrandSettings(profileId)
  const rederive = useRederiveBrandSettings(profileId)

  const [primary, setPrimary] = useState('#1e3a8a')
  const [accent, setAccent] = useState('#f97316')
  const [background, setBackground] = useState<BrandBackgroundMode>('cream')
  const [styles, setStyles] = useState<CarouselStyleKey[]>([])
  const [allowMemes, setAllowMemes] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data) return
    setPrimary(data.colors.primary)
    setAccent(data.colors.accent)
    setBackground(data.colors.background)
    setStyles(data.lockedStyles)
    setAllowMemes(!!data.allowMemes)
    setDirty(false)
  }, [data])

  const colorsForPreview = useMemo(
    () => ({ primary, accent, background }),
    [primary, accent, background],
  )

  const togglePrimary = (hex: string) => {
    setPrimary(hex)
    setDirty(true)
  }
  const toggleAccent = (hex: string) => {
    setAccent(hex)
    setDirty(true)
  }
  const toggleBg = (bg: BrandBackgroundMode) => {
    setBackground(bg)
    setDirty(true)
  }
  const toggleStyle = (key: CarouselStyleKey) => {
    setStyles((prev) => {
      const isSelected = prev.includes(key)
      if (isSelected) {
        if (prev.length <= 2) return prev
        return prev.filter((k) => k !== key)
      }
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
    setDirty(true)
  }

  const primaryValid = HEX_RX.test(primary)
  const accentValid = HEX_RX.test(accent)
  const stylesValid = styles.length >= 2 && styles.length <= 3
  const canSave = dirty && primaryValid && accentValid && stylesValid

  const handleSave = () => {
    update.mutate(
      {
        colors: { primary, accent, background },
        lockedStyles: styles,
        allowMemes,
      },
      { onSuccess: () => setDirty(false) },
    )
  }

  if (isLoading || !data) {
    return (
      <div className='rounded-xl border p-6'>
        <div className='flex items-center gap-2'>
          <IconLoader2 className='text-muted-foreground size-4 animate-spin' />
          <p className='text-muted-foreground text-sm'>Loading brand settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='rounded-xl border p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <IconPalette className='text-primary size-5' />
          <h2 className='text-lg font-semibold'>Brand for Carousels</h2>
          {data.autoDerived && (
            <Badge variant='secondary' className='gap-1'>
              <IconSparkles className='size-3' /> Auto
            </Badge>
          )}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => rederive.mutate()}
          disabled={rederive.isPending}
        >
          {rederive.isPending ? (
            <IconLoader2 className='mr-2 size-4 animate-spin' />
          ) : (
            <IconRefresh className='mr-2 size-4' />
          )}
          Re-derive
        </Button>
      </div>

      <p className='text-muted-foreground mb-6 text-sm'>
        Your carousels rotate between {styles.length} locked templates, each tinted with your brand
        colors. Pick the colors and templates that feel like you.
      </p>

      <div className='space-y-6'>
        <div className='grid grid-cols-2 gap-4'>
          <ColorField
            label='Primary'
            hex={primary}
            valid={primaryValid}
            onChange={togglePrimary}
            hint='Backgrounds, ink, dominant accents'
          />
          <ColorField
            label='Accent'
            hex={accent}
            valid={accentValid}
            onChange={toggleAccent}
            hint='Punchlines, badges, highlights'
          />
        </div>

        <div>
          <p className='text-muted-foreground mb-2 text-xs font-medium'>Background mode</p>
          <div className='flex gap-2'>
            {BG_MODES.map((b) => (
              <button
                key={b.value}
                type='button'
                onClick={() => toggleBg(b.value)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm transition-all',
                  background === b.value
                    ? 'border-primary bg-primary/5 ring-primary/30 ring-2'
                    : 'border-muted hover:border-muted-foreground/30',
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className='mb-2 flex items-center justify-between'>
            <p className='text-muted-foreground text-xs font-medium'>
              Locked templates ({styles.length}/3)
            </p>
            <p className='text-muted-foreground text-[11px]'>
              Pick 2 or 3 — your carousels rotate between them
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
            {STYLE_META.map((meta) => {
              const selected = styles.includes(meta.key)
              const swatches = meta.demoSwatches(colorsForPreview)
              return (
                <button
                  key={meta.key}
                  type='button'
                  onClick={() => toggleStyle(meta.key)}
                  className={cn(
                    'group relative rounded-lg border p-3 text-left transition-all',
                    selected
                      ? 'border-primary ring-primary/30 ring-2'
                      : 'border-muted hover:border-muted-foreground/30',
                  )}
                >
                  <div
                    className='mb-2 flex h-16 items-center justify-center rounded-md border'
                    style={{ backgroundColor: swatches.bg }}
                  >
                    <div className='flex items-center gap-1'>
                      <span
                        className='inline-block size-3 rounded-full'
                        style={{ backgroundColor: swatches.chip }}
                      />
                      <span
                        className='text-[10px] font-bold tracking-tight'
                        style={{ color: swatches.ink }}
                      >
                        Aa
                      </span>
                    </div>
                  </div>
                  <p className='text-xs font-medium'>{meta.label}</p>
                  <p className='text-muted-foreground line-clamp-2 text-[10px]'>{meta.vibe}</p>
                  {selected && (
                    <div className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full'>
                      <IconCheck className='size-3' />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {!stylesValid && (
            <p className='text-destructive mt-2 text-xs'>
              Pick 2 or 3 templates (currently {styles.length}).
            </p>
          )}
        </div>

        <div className='border-muted/50 rounded-lg border p-3'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-start gap-3'>
              <IconMoodSmile className='text-muted-foreground mt-0.5 size-4 shrink-0' />
              <div>
                <Label
                  htmlFor='allow-memes-toggle'
                  className='text-sm font-medium'
                >
                  Allow trending memes
                </Label>
                <p className='text-muted-foreground mt-0.5 text-xs'>
                  When on, posts that fit a meme format may be illustrated with a
                  curated, LinkedIn-appropriate meme template instead of a custom
                  illustration. Off by default — turn on when you're comfortable
                  with the tone.
                </p>
              </div>
            </div>
            <Switch
              id='allow-memes-toggle'
              checked={allowMemes}
              onCheckedChange={(next) => {
                setAllowMemes(next)
                setDirty(true)
              }}
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-2 border-t pt-4'>
          {dirty && (
            <p className='text-muted-foreground mr-auto text-xs'>Unsaved changes</p>
          )}
          <Button
            variant='ghost'
            size='sm'
            disabled={!dirty || update.isPending}
            onClick={() => {
              if (!data) return
              setPrimary(data.colors.primary)
              setAccent(data.colors.accent)
              setBackground(data.colors.background)
              setStyles(data.lockedStyles)
              setAllowMemes(!!data.allowMemes)
              setDirty(false)
            }}
          >
            Reset
          </Button>
          <Button size='sm' disabled={!canSave || update.isPending} onClick={handleSave}>
            {update.isPending && <IconLoader2 className='mr-2 size-4 animate-spin' />}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function ColorField({
  label,
  hex,
  valid,
  onChange,
  hint,
}: {
  label: string
  hex: string
  valid: boolean
  onChange: (next: string) => void
  hint: string
}) {
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs font-medium'>{label}</p>
      <div className='flex items-center gap-2'>
        <input
          type='color'
          value={valid ? hex : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className='size-10 cursor-pointer rounded-md border'
          aria-label={`${label} color picker`}
        />
        <Input
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className={cn('font-mono uppercase', !valid && 'border-destructive')}
          maxLength={7}
          placeholder='#000000'
        />
      </div>
      <p className='text-muted-foreground mt-1 text-[11px]'>{hint}</p>
    </div>
  )
}
