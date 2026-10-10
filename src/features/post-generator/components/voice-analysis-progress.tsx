import { useEffect, useState } from 'react'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useVoiceAnalysisProgress } from '../query/post-generator.query'

/** How long each post preview stays on screen while a step works through them. */
const PREVIEW_MS = 2200

/**
 * What a voice analysis is doing right now: a checklist of the steps so far,
 * the current one spinning with its count, and the first lines of the posts it
 * is reading cycling underneath, so half a minute of work reads as progress
 * rather than a frozen spinner.
 */
export function VoiceAnalysisProgress({
  profileId,
  active,
  className,
}: {
  profileId: string
  active: boolean
  className?: string
}) {
  const { steps, previews, error } = useVoiceAnalysisProgress(profileId, active)
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    setPreviewIndex(0)
    if (previews.length < 2) return
    const timer = setInterval(
      () => setPreviewIndex((i) => (i + 1) % previews.length),
      PREVIEW_MS
    )
    return () => clearInterval(timer)
  }, [previews])

  if (!active) return null

  const preview = previews[previewIndex]
  const visibleSteps = steps.length
    ? steps
    : [{ key: 'start', label: 'Getting started', status: 'active' as const }]

  return (
    <div className={cn('space-y-3', className)} aria-live='polite'>
      <ol className='space-y-2'>
        {visibleSteps.map((step) => (
          <li key={step.key} className='flex items-start gap-2.5 text-sm'>
            <span className='mt-0.5 flex size-4 shrink-0 items-center justify-center'>
              {step.status === 'done' ? (
                <IconCheck className='size-4 text-green-600' />
              ) : (
                <IconLoader2 className='text-primary size-4 animate-spin' />
              )}
            </span>
            <span className='min-w-0'>
              <span
                className={cn(
                  step.status === 'done' ? 'text-muted-foreground' : 'font-medium'
                )}
              >
                {step.label}
              </span>
              {step.detail && (
                <span className='text-muted-foreground ml-1.5 text-xs'>
                  · {step.detail}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {preview && (
        <div className='bg-muted/50 rounded-lg px-3 py-2'>
          <p className='text-muted-foreground mb-0.5 text-[11px] font-medium'>
            {previews.length > 1
              ? `Reading ${previewIndex + 1} of ${previews.length}`
              : 'Reading'}
          </p>
          <p
            key={previewIndex}
            className='animate-in fade-in truncate text-sm italic duration-500'
          >
            “{preview}”
          </p>
        </div>
      )}

      {error && <p className='text-xs text-red-500'>{error}</p>}
    </div>
  )
}
