import { useEffect, useState } from 'react'
import {
  IconLoader2,
  IconRefresh,
  IconEdit,
  IconAlertTriangle,
  IconFileTypePdf,
  IconPalette,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import type {
  CarouselPayload,
  CarouselSlideState,
  CarouselStyleKey,
  PostMedia,
  SlideTemplateKey,
} from '../api/post-generator.api'

const SLIDE_TEMPLATE_LABELS: Record<SlideTemplateKey, string> = {
  generic: 'Generic (default)',
  deck_cover: 'Deck cover',
  deck_closer: 'Deck closer',
  photo_metaphor: 'Photo metaphor',
  process_flowchart: 'Process flowchart',
  comparison_table: 'Comparison table',
}

const SLIDE_TEMPLATE_DESCRIPTIONS: Record<SlideTemplateKey, string> = {
  generic: 'Standard headline + body slide. Use when no other template fits.',
  deck_cover:
    'Magazine-cover layout for slot 0 — kicker, hero headline, single metaphor object.',
  deck_closer:
    'Final-slide layout — numbered recap + optional CTA pill. Use only on the last slot.',
  photo_metaphor:
    'One giant rendered metaphor object + a short caption. Best when the slide is a single strong claim.',
  process_flowchart:
    'Connected step nodes (left-to-right or top-to-bottom). Use when the body describes a flow.',
  comparison_table:
    'Structured grid comparing 2-4 options across 1-5 criteria.',
}

const STYLE_LABELS: Record<CarouselStyleKey, string> = {
  gradient_modern: 'Gradient Modern',
  editorial_quote: 'Editorial Quote',
  hand_drawn: 'Hand Drawn',
  tabloid_breaking: 'Tabloid Breaking',
  minimalist_blue: 'Minimalist',
  vintage_print: 'Vintage Print',
}

const ALL_STYLES: CarouselStyleKey[] = [
  'gradient_modern',
  'editorial_quote',
  'hand_drawn',
  'tabloid_breaking',
  'minimalist_blue',
  'vintage_print',
]

export interface CarouselStripProps {
  carousel: CarouselPayload
  media: PostMedia[]
  onEditSlide: (slideIndex: number, instruction: string) => void
  onRegenerateSlide: (
    slideIndex: number,
    overrides: {
      title?: string
      body?: string
      accent?: string
      slideTemplate?: SlideTemplateKey
    },
  ) => void
  onSwitchTemplate: (styleKey: CarouselStyleKey) => void
  isMutating: boolean
}

export function CarouselStrip({
  carousel,
  media,
  onEditSlide,
  onRegenerateSlide,
  onSwitchTemplate,
  isMutating,
}: CarouselStripProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [activeSlide, setActiveSlide] = useState<CarouselSlideState | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)

  const pdfMedia = media.find((m) => m.aiKind === 'carousel_pdf')
  const slides = carousel.slides ?? []
  const hasSlides = slides.length > 0
  const allSlidesReady = hasSlides && slides.every((s) => s.status === 'ready')
  const isAssembling =
    carousel.status === 'assembling' ||
    (allSlidesReady && carousel.status !== 'ready')
  // While we're seeding a fresh carousel (convertToCarousel set status=generating
  // with slides=[]), show placeholder tiles so the user gets visual feedback
  // during the 5-30s gap before slides start streaming in.
  const isSeeding = !hasSlides && carousel.status === 'generating'
  const placeholderCount = 5
  const styleLabel = carousel.styleKey
    ? (STYLE_LABELS[carousel.styleKey] ?? carousel.styleKey)
    : 'Building…'

  return (
    <div className='mt-6 w-full min-w-0 space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-xs'>
          <span className='inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-1 font-medium text-violet-700'>
            <IconPalette className='size-3' />
            Carousel · {styleLabel}
          </span>
          <span className='text-muted-foreground'>
            {hasSlides ? `${slides.length} slides` : 'preparing slides'}
          </span>
          {carousel.status === 'generating' && !allSlidesReady && (
            <span className='inline-flex items-center gap-1 text-amber-700'>
              <IconLoader2 className='size-3 animate-spin' />
              Slides generating…
            </span>
          )}
          {isAssembling && (
            <span className='inline-flex items-center gap-1 text-blue-700'>
              <IconLoader2 className='size-3 animate-spin' />
              Assembling PDF…
            </span>
          )}
          {carousel.status === 'failed' && (
            <span className='inline-flex items-center gap-1 text-red-700'>
              <IconAlertTriangle className='size-3' />
              {carousel.error || 'Generation failed'}
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {pdfMedia && (
            <Button asChild variant='outline' size='sm' className='h-8 text-xs'>
              <a href={pdfMedia.url} target='_blank' rel='noopener noreferrer'>
                <IconDownload className='mr-1.5 size-3.5' />
                Download PDF
              </a>
            </Button>
          )}
          {hasSlides && (
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setSwitchOpen(true)}
              disabled={isMutating}
            >
              <IconPalette className='mr-1.5 size-3.5' />
              Switch template
            </Button>
          )}
        </div>
      </div>

      <div className='flex gap-3 overflow-x-auto pb-2'>
        {hasSlides
          ? slides.map((slide) => (
              <SlideTile
                key={slide.index}
                slide={slide}
                onClick={() => setPreviewIndex(slide.index)}
              />
            ))
          : isSeeding &&
            Array.from({ length: placeholderCount }).map((_, i) => (
              <SlideSkeletonTile key={i} index={i} />
            ))}
      </div>

      {previewIndex !== null && (
        <SlideLightboxDialog
          slides={carousel.slides}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onChangeIndex={setPreviewIndex}
          onEdit={(slide) => {
            setPreviewIndex(null)
            setActiveSlide(slide)
          }}
        />
      )}

      {activeSlide && (
        <SlideActionsDialog
          slide={activeSlide}
          slideCount={slides.length}
          onClose={() => setActiveSlide(null)}
          onEdit={(instruction) => {
            onEditSlide(activeSlide.index, instruction)
            setActiveSlide(null)
          }}
          onRegenerate={(overrides) => {
            onRegenerateSlide(activeSlide.index, overrides)
            setActiveSlide(null)
          }}
          isMutating={isMutating}
        />
      )}

      <SwitchTemplateDialog
        open={switchOpen}
        currentStyle={carousel.styleKey}
        onClose={() => setSwitchOpen(false)}
        onConfirm={(styleKey) => {
          onSwitchTemplate(styleKey)
          setSwitchOpen(false)
        }}
        isMutating={isMutating}
      />
    </div>
  )
}

function SlideSkeletonTile({ index }: { index: number }) {
  return (
    <div
      className='border-border bg-muted/40 relative flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-md border'
      aria-label={`Slide ${index + 1} generating`}
    >
      <IconLoader2 className='text-muted-foreground size-5 animate-spin' />
      <span className='text-muted-foreground text-[10px]'>
        Slide {index + 1}
      </span>
    </div>
  )
}

function SlideTile({
  slide,
  onClick,
}: {
  slide: CarouselSlideState
  onClick: () => void
}) {
  const ready = slide.status === 'ready' && !!slide.url
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'group relative h-44 w-44 shrink-0 overflow-hidden rounded-lg border bg-muted text-left transition-transform hover:scale-[1.02]',
        slide.status === 'failed' && 'border-red-400',
      )}
      title={slide.title}
    >
      {ready ? (
        <img src={slide.url} alt={slide.title} className='h-full w-full object-cover' />
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center'>
          {slide.status === 'failed' ? (
            <IconAlertTriangle className='size-6 text-red-500' />
          ) : (
            <IconLoader2 className='size-6 animate-spin text-muted-foreground' />
          )}
          <span className='line-clamp-3 text-[10px] text-muted-foreground'>
            {slide.title}
          </span>
        </div>
      )}
      <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2'>
        <span className='line-clamp-2 text-[10px] font-medium text-white'>
          {slide.title}
        </span>
        <span className='rounded bg-black/60 px-1 py-px text-[9px] font-medium text-white'>
          {slide.index + 1}
        </span>
      </div>
      {ready && (
        <div className='absolute inset-x-0 top-0 hidden items-center justify-end gap-1 p-1 group-hover:flex'>
          <span className='rounded-full bg-black/70 p-1 text-white'>
            <IconZoomIn className='size-3' />
          </span>
        </div>
      )}
    </button>
  )
}

function SlideLightboxDialog({
  slides,
  index,
  onClose,
  onChangeIndex,
  onEdit,
}: {
  slides: CarouselSlideState[]
  index: number
  onClose: () => void
  onChangeIndex: (next: number) => void
  onEdit: (slide: CarouselSlideState) => void
}) {
  const slide = slides[index]
  const hasPrev = index > 0
  const hasNext = index < slides.length - 1
  const ready = slide?.status === 'ready' && !!slide.url

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) onChangeIndex(index - 1)
      else if (e.key === 'ArrowRight' && hasNext) onChangeIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, hasPrev, hasNext, onChangeIndex])

  if (!slide) return null

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className='max-w-3xl gap-4 p-4 sm:p-6'>
        <DialogHeader className='flex flex-row items-start justify-between gap-2 space-y-0'>
          <div className='min-w-0'>
            <DialogTitle className='truncate'>{slide.title}</DialogTitle>
            <DialogDescription className='text-xs'>
              Slide {index + 1} of {slides.length}
            </DialogDescription>
          </div>
          <Button
            size='sm'
            variant='outline'
            onClick={() => onEdit(slide)}
            disabled={!ready}
            className='shrink-0'
          >
            <IconEdit className='mr-1.5 size-3.5' />
            Edit slide
          </Button>
        </DialogHeader>

        <div className='relative flex items-center justify-center'>
          <Button
            variant='outline'
            size='icon'
            className='absolute left-1 z-10 size-9 rounded-full shadow disabled:opacity-30'
            onClick={() => hasPrev && onChangeIndex(index - 1)}
            disabled={!hasPrev}
            aria-label='Previous slide'
          >
            <IconChevronLeft className='size-5' />
          </Button>

          <div className='flex aspect-square w-full max-w-[560px] items-center justify-center overflow-hidden rounded-lg border bg-muted'>
            {ready ? (
              <img
                src={slide.url}
                alt={slide.title}
                className='h-full w-full object-contain'
              />
            ) : (
              <div className='flex flex-col items-center gap-2 p-6 text-center'>
                {slide.status === 'failed' ? (
                  <>
                    <IconAlertTriangle className='size-8 text-red-500' />
                    <span className='text-xs text-red-700'>
                      {slide.error || 'Slide generation failed'}
                    </span>
                  </>
                ) : (
                  <>
                    <IconLoader2 className='size-8 animate-spin text-muted-foreground' />
                    <span className='text-xs text-muted-foreground'>
                      Generating…
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            variant='outline'
            size='icon'
            className='absolute right-1 z-10 size-9 rounded-full shadow disabled:opacity-30'
            onClick={() => hasNext && onChangeIndex(index + 1)}
            disabled={!hasNext}
            aria-label='Next slide'
          >
            <IconChevronRight className='size-5' />
          </Button>
        </div>

        {slide.body && (
          <p className='line-clamp-3 text-center text-xs text-muted-foreground'>
            {slide.body}
          </p>
        )}

        <div className='flex justify-center gap-1.5'>
          {slides.map((s, i) => (
            <button
              key={s.index}
              type='button'
              onClick={() => onChangeIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SlideActionsDialog({
  slide,
  slideCount,
  onClose,
  onEdit,
  onRegenerate,
  isMutating,
}: {
  slide: CarouselSlideState
  slideCount: number
  onClose: () => void
  onEdit: (instruction: string) => void
  onRegenerate: (overrides: {
    title?: string
    body?: string
    accent?: string
    slideTemplate?: SlideTemplateKey
  }) => void
  isMutating: boolean
}) {
  const [instruction, setInstruction] = useState('')
  const [title, setTitle] = useState(slide.title)
  const [body, setBody] = useState(slide.body || '')
  const [accent, setAccent] = useState(slide.accent || '')
  const currentTemplate: SlideTemplateKey = slide.slideTemplate ?? 'generic'
  const [template, setTemplate] = useState<SlideTemplateKey>(currentTemplate)

  // Hook (slot 0) and close (last slot) are pinned to deck_cover/deck_closer
  // by the backend regardless of UI selection — show the locked template and
  // disable the dropdown so users aren't surprised.
  const isHook = slide.index === 0
  const isClose = slide.index === slideCount - 1
  const templateLocked = isHook || isClose
  const lockedReason = isHook
    ? "The first slide is the deck cover and can't be swapped."
    : isClose
      ? "The final slide is the deck closer and can't be swapped."
      : ''

  const allowedTemplates: SlideTemplateKey[] = templateLocked
    ? [currentTemplate]
    : (['generic', 'photo_metaphor', 'process_flowchart', 'comparison_table'] as SlideTemplateKey[])

  const titleDirty = title !== slide.title
  const bodyDirty = body !== (slide.body || '')
  const accentDirty = accent !== (slide.accent || '')
  const templateDirty = template !== currentTemplate
  const regenChanged = titleDirty || bodyDirty || accentDirty || templateDirty

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>Slide {slide.index + 1}</DialogTitle>
          <DialogDescription>
            Edit the rendered image with a natural-language instruction, or
            change the underlying text and regenerate the slide from scratch.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='edit'>
          <TabsList>
            <TabsTrigger value='edit'>
              <IconEdit className='mr-1.5 size-3.5' />
              Edit image
            </TabsTrigger>
            <TabsTrigger value='regenerate'>
              <IconRefresh className='mr-1.5 size-3.5' />
              Regenerate
            </TabsTrigger>
          </TabsList>

          <TabsContent value='edit' className='space-y-3'>
            {slide.url && (
              <img
                src={slide.url}
                alt={slide.title}
                className='mx-auto h-40 w-40 rounded-md border object-cover'
              />
            )}
            <Textarea
              placeholder='e.g., "Make the background darker blue and increase the contrast on the headline"'
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant='outline' onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!instruction.trim() || isMutating}
                onClick={() => onEdit(instruction.trim())}
              >
                {isMutating && <IconLoader2 className='mr-1.5 size-3.5 animate-spin' />}
                Apply edit
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value='regenerate' className='space-y-3'>
            <div>
              <label className='mb-1 block text-xs font-medium text-muted-foreground'>
                Slide template
              </label>
              <Select
                value={template}
                onValueChange={(v) => setTemplate(v as SlideTemplateKey)}
                disabled={templateLocked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTemplates.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SLIDE_TEMPLATE_LABELS[key]}
                      {key === currentTemplate && ' (current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='mt-1 text-[11px] leading-snug text-muted-foreground'>
                {templateLocked
                  ? lockedReason
                  : SLIDE_TEMPLATE_DESCRIPTIONS[template]}
              </p>
              {templateDirty && !templateLocked && (
                <p className='mt-1 text-[11px] leading-snug text-amber-700'>
                  Switching template will rewrite this slide's structured
                  content (a quick AI pass) before regenerating the image.
                </p>
              )}
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-muted-foreground'>
                Headline (3-7 words)
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-muted-foreground'>
                Supporting line (optional)
              </label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-muted-foreground'>
                Accent word (optional)
              </label>
              <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={isMutating}
                onClick={() =>
                  onRegenerate({
                    title: titleDirty ? title : undefined,
                    body: bodyDirty ? body : undefined,
                    accent: accentDirty ? accent : undefined,
                    slideTemplate: templateDirty ? template : undefined,
                  })
                }
              >
                {isMutating && <IconLoader2 className='mr-1.5 size-3.5 animate-spin' />}
                {regenChanged ? 'Regenerate with new text' : 'Regenerate'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function SwitchTemplateDialog({
  open,
  currentStyle,
  onClose,
  onConfirm,
  isMutating,
}: {
  open: boolean
  currentStyle: CarouselStyleKey
  onClose: () => void
  onConfirm: (styleKey: CarouselStyleKey) => void
  isMutating: boolean
}) {
  const [selected, setSelected] = useState<CarouselStyleKey>(currentStyle)

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Switch template</DialogTitle>
          <DialogDescription>
            Re-renders every slide using the new template's design language.
            Slide text is preserved.
          </DialogDescription>
        </DialogHeader>
        <Select value={selected} onValueChange={(v) => setSelected(v as CarouselStyleKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STYLES.map((s) => (
              <SelectItem key={s} value={s}>
                {STYLE_LABELS[s]}
                {s === currentStyle && ' (current)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isMutating || selected === currentStyle}
            onClick={() => onConfirm(selected)}
          >
            {isMutating && <IconLoader2 className='mr-1.5 size-3.5 animate-spin' />}
            <span className='inline-flex items-center gap-1.5'>
              <IconFileTypePdf className='size-3.5' />
              Switch & regenerate all
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
