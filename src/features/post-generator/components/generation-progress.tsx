import { IconCheck, IconLink } from '@tabler/icons-react'
import { ThinkingOrb } from '@/components/thinking-orb'
import { cn } from '@/lib/utils'
import type {
  PostStage,
  ResearchClaim,
} from '../query/post-generator.query'
import {
  STAGE_DETAIL,
  STAGE_LABEL,
  STAGE_ORDER,
  stageRow,
} from '../utils/stage-label'

interface GenerationProgressProps {
  /** Undefined until the first progress event arrives. */
  stage?: PostStage
  /**
   * What the current stage is doing right now, when it reports it. Research
   * does, and it is the stage that needs it: it runs for the best part of a
   * minute behind a label that never changes.
   */
  detail?: string
  claims?: ResearchClaim[]
}

/**
 * What the generator is doing, in place of the empty editor.
 *
 * The composer previously showed a "Generating..." badge over an empty box for
 * the length of a research-plus-critique run, which reads as a hang. The
 * stages already stream over SSE for the calendar grid; this puts them where
 * someone waiting on one specific post is actually looking.
 */
export function GenerationProgress({
  stage,
  detail,
  claims,
}: GenerationProgressProps) {
  const current = stage ? stageRow(stage) : undefined
  const currentIndex = current ? STAGE_ORDER.indexOf(current) : -1
  // The first stage event lands well after the job is queued, and a list of
  // four grey steps with nothing moving is indistinguishable from a hang.
  const caption = stage ? STAGE_LABEL[stage] : 'Getting started'
  const subtitle =
    detail ?? (stage ? STAGE_DETAIL[stage] : 'Waking up the writer')

  return (
    <div className='space-y-8 py-4'>
      <div className='flex items-center gap-4'>
        <ThinkingOrb size={44} className='text-primary' label={caption} />
        <div className='space-y-1'>
          <p className='text-shimmer text-sm font-medium'>{caption}</p>
          <p className='text-muted-foreground text-xs'>{subtitle}</p>
        </div>
      </div>

      <ol className='space-y-3'>
        {STAGE_ORDER.map((step, index) => {
          const done = currentIndex > index
          const active = currentIndex === index

          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 text-sm transition-colors',
                done && 'text-muted-foreground',
                active && 'text-foreground font-medium',
                // Steps that have not started read as not-yet rather than
                // disabled, so the list still shows what is coming.
                !done && !active && 'text-muted-foreground/50',
              )}
            >
              <span className='flex size-5 shrink-0 items-center justify-center'>
                {done ? (
                  <IconCheck className='size-4' />
                ) : active ? (
                  // The orb above already carries the motion, so the marker
                  // only has to say which row it belongs to.
                  <span className='bg-primary size-1.5 rounded-full' />
                ) : (
                  <span className='bg-muted-foreground/30 size-1.5 rounded-full' />
                )}
              </span>
              {/* `revising` shares the writing row, so name it when it happens
                  rather than silently sitting on "Writing the draft". */}
              {active && stage === 'revising' ? STAGE_LABEL.revising : STAGE_LABEL[step]}
            </li>
          )
        })}
      </ol>

      {claims && claims.length > 0 && <ResearchSources claims={claims} />}
    </div>
  )
}

/**
 * What the post was built on.
 *
 * Shown during generation and kept on the finished draft: a post that cites a
 * number is only checkable if the author can still see where it came from.
 */
export function ResearchSources({ claims }: { claims: ResearchClaim[] }) {
  return (
    <div className='mt-6 space-y-2 border-t pt-4'>
      <p className='text-muted-foreground text-xs font-medium'>Sources</p>
      <ul className='space-y-2'>
        {/* Several claims routinely come from one report, so the URL is not a
            key. */}
        {claims.map((claim, index) => (
          <li key={`${claim.url ?? ''}-${index}`} className='text-xs'>
            <span className='text-foreground'>{claim.headline}</span>
            {claim.url && (
              <a
                href={claim.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-foreground ml-1.5 inline-flex items-center gap-0.5 underline underline-offset-2'
              >
                <IconLink className='size-3' />
                {sourceLabel(claim)}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * `source` holds whichever of the publication name or the link the research
 * model returned, so it is a full URL about half the time. Printing that
 * inline swamps the claim it belongs to.
 */
function sourceLabel(claim: ResearchClaim): string {
  const source = claim.source?.trim()
  if (source && !/^https?:\/\//i.test(source)) return source

  try {
    return new URL(source || claim.url!).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}
