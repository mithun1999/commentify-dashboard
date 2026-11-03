import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { getReadableErrorMessage } from '@/lib/connection-recovery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AiKeyProvider, AiKeyView } from '../api/ai-keys.api'
import {
  useAiKeysQuery,
  useRecheckAiKey,
  useRemoveAiKey,
  useSaveAiKey,
} from '../query/ai-keys.query'

const PROVIDERS: Record<
  AiKeyProvider,
  {
    name: string
    placeholder: string
    createUrl: string
    creditUrl: string
  }
> = {
  openrouter: {
    name: 'OpenRouter',
    placeholder: 'sk-or-v1-…',
    createUrl: 'https://openrouter.ai/settings/keys',
    creditUrl: 'https://openrouter.ai/settings/credits',
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-…',
    createUrl: 'https://platform.openai.com/api-keys',
    creditUrl: 'https://platform.openai.com/settings/organization/billing',
  },
}

function StatusLine({ view }: { view: AiKeyView }) {
  const provider = PROVIDERS[view.provider]
  if (view.status === 'valid') {
    const credit =
      typeof view.creditRemainingUsd === 'number'
        ? ` · $${view.creditRemainingUsd.toFixed(2)} credit left`
        : ''
    return (
      <p className='flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400'>
        <CheckCircle2 className='size-4' />
        Working{credit}
      </p>
    )
  }
  const message =
    view.status === 'out_of_credit' ? (
      <>
        This key works but has no credit left. Your agents stay paused until you{' '}
        <a
          href={provider.creditUrl}
          target='_blank'
          rel='noreferrer'
          className='underline underline-offset-2'
        >
          add credit on {provider.name}
        </a>
        , then check again.
      </>
    ) : view.status === 'invalid' ? (
      `${provider.name} no longer accepts this key. Replace it with a new one.`
    ) : (
      `We couldn't reach ${provider.name} to check this key. Check again in a minute.`
    )
  return (
    <p className='flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400'>
      <AlertCircle className='mt-0.5 size-4 shrink-0' />
      <span>{message}</span>
    </p>
  )
}

function KeyRow({
  provider,
  view,
  optional,
  description,
}: {
  provider: AiKeyProvider
  view?: AiKeyView
  optional?: boolean
  description: React.ReactNode
}) {
  const meta = PROVIDERS[provider]
  const [editing, setEditing] = useState(!view)
  const [value, setValue] = useState('')
  const save = useSaveAiKey()
  const recheck = useRecheckAiKey()
  const remove = useRemoveAiKey()
  const error = save.error ?? recheck.error ?? remove.error
  const busy = save.isPending || recheck.isPending || remove.isPending

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const key = value.trim()
    if (!key || busy) return
    recheck.reset()
    remove.reset()
    try {
      await save.mutateAsync({ provider, key })
      setValue('')
      setEditing(false)
    } catch {
      // Shown below from save.error.
    }
  }

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <KeyRound className='text-muted-foreground size-4' />
          <Label htmlFor={`ai-key-${provider}`} className='font-medium'>
            {meta.name} key
          </Label>
          <Badge variant='secondary'>
            {optional ? 'Optional' : 'Required'}
          </Badge>
        </div>
        <a
          href={meta.createUrl}
          target='_blank'
          rel='noreferrer'
          className='text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs underline-offset-2 hover:underline'
        >
          Get a key
          <ExternalLink className='size-3' />
        </a>
      </div>
      <p className='text-muted-foreground text-sm'>{description}</p>

      {view && !editing ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span className='font-mono text-sm'>•••• {view.last4}</span>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => {
                  save.reset()
                  remove.reset()
                  recheck.mutate(provider)
                }}
              >
                {recheck.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <RefreshCw className='size-4' />
                )}
                Check again
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => {
                  recheck.reset()
                  setEditing(true)
                }}
              >
                Replace
              </Button>
              {optional && (
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  disabled={busy}
                  onClick={() => {
                    save.reset()
                    recheck.reset()
                    remove.mutate(provider)
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          <StatusLine view={view} />
        </div>
      ) : (
        <form onSubmit={submit} className='flex flex-col gap-2 sm:flex-row'>
          <Input
            id={`ai-key-${provider}`}
            type='password'
            autoComplete='off'
            spellCheck={false}
            placeholder={meta.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          <div className='flex gap-2'>
            <Button type='submit' disabled={!value.trim() || busy}>
              {save.isPending && <Loader2 className='size-4 animate-spin' />}
              {save.isPending ? 'Checking…' : 'Save key'}
            </Button>
            {view && (
              <Button
                type='button'
                variant='ghost'
                disabled={busy}
                onClick={() => {
                  save.reset()
                  setValue('')
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {error ? (
        <p className='text-destructive flex items-start gap-1.5 text-sm'>
          <AlertCircle className='mt-0.5 size-4 shrink-0' />
          <span>
            {getReadableErrorMessage(
              error,
              `We couldn't save this key. Check it and try again.`
            )}
          </span>
        </p>
      ) : null}
    </div>
  )
}

/**
 * The account's own AI keys, for plans that run on them (AppSumo licenses).
 * OpenRouter is the one everything needs; OpenAI is an optional extra that
 * GPT models and images use directly when it is there.
 */
export function AiKeysForm() {
  const { data: keys, isLoading, error } = useAiKeysQuery(true)
  const [showOpenAi, setShowOpenAi] = useState(false)

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-2 py-4 text-sm'>
        <Loader2 className='size-4 animate-spin' />
        Loading your keys…
      </div>
    )
  }
  if (error) {
    return (
      <p className='text-destructive text-sm'>
        {getReadableErrorMessage(error, `We couldn't load your keys.`)}
      </p>
    )
  }

  const openRouter = keys?.find((k) => k.provider === 'openrouter')
  const openAi = keys?.find((k) => k.provider === 'openai')

  return (
    <div className='space-y-4'>
      <KeyRow
        // Remount when the saved key appears or goes, so the row opens on the
        // right mode.
        key={`openrouter-${openRouter?.last4 ?? 'none'}`}
        provider='openrouter'
        view={openRouter}
        description='One OpenRouter key covers every model the agents use. Add a few dollars of credit to it; at typical use an account costs a few dollars a month.'
      />
      {openAi || showOpenAi ? (
        <KeyRow
          key={`openai-${openAi?.last4 ?? 'none'}`}
          provider='openai'
          view={openAi}
          optional
          description='With an OpenAI key too, GPT models and images run on OpenAI directly. Everything else stays on OpenRouter.'
        />
      ) : (
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground text-sm underline underline-offset-2'
          onClick={() => setShowOpenAi(true)}
        >
          I also have an OpenAI key
        </button>
      )}
    </div>
  )
}
