import { useState } from 'react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmToolCall } from '../api/copilot.api'

export interface PendingConfirmation {
  id: string
  action: string
  question: string
  details?: string[]
}

type Outcome =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'done' }
  | { state: 'failed'; message: string }

/**
 * The click that Tier 3 actions wait on.
 *
 * Approval is its own authenticated request rather than another turn of the
 * conversation, so the model cannot approve on the user's behalf: the worst it
 * can do is ask again. The arguments live on the server, so what runs is what
 * this card describes.
 */
export function ConfirmCard({
  confirmation,
}: {
  confirmation: PendingConfirmation
}) {
  const [outcome, setOutcome] = useState<Outcome>({ state: 'idle' })

  const run = async () => {
    setOutcome({ state: 'running' })
    try {
      const result = await confirmToolCall(confirmation.id)
      if (result.ok) {
        setOutcome({ state: 'done' })
        return
      }
      setOutcome({
        state: 'failed',
        message: result.refusal?.message ?? 'That did not work.',
      })
    } catch (error) {
      setOutcome({
        state: 'failed',
        message:
          error instanceof Error ? error.message : 'That did not work.',
      })
    }
  }

  if (outcome.state === 'done') {
    return (
      <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
        <Check className='size-3 shrink-0' />
        <span>{confirmation.action} done</span>
      </div>
    )
  }

  return (
    <div className='bg-muted/40 space-y-2 rounded-md border p-3'>
      <p className='text-sm font-medium'>{confirmation.question}</p>

      {confirmation.details?.length ? (
        <ul className='text-muted-foreground space-y-0.5 text-xs'>
          {confirmation.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {outcome.state === 'failed' && (
        <p className='text-destructive flex items-start gap-1.5 text-xs'>
          <AlertCircle className='mt-0.5 size-3 shrink-0' />
          <span>{outcome.message}</span>
        </p>
      )}

      <Button
        size='sm'
        className='h-7 text-xs'
        disabled={outcome.state === 'running'}
        onClick={run}
      >
        {outcome.state === 'running' && (
          <Loader2 className='mr-1.5 size-3 animate-spin' />
        )}
        {outcome.state === 'failed' ? 'Try again' : confirmation.action}
      </Button>
    </div>
  )
}
