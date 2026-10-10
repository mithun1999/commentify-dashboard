import { useState } from 'react'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { copyText } from '../copy'

interface CopyFieldProps {
  value: string
  /** Multi-line values (JSON) render as a block. */
  block?: boolean
  disabled?: boolean
  className?: string
}

/** A value the user pastes somewhere else, with a copy button beside it. */
export function CopyField({
  value,
  block,
  disabled,
  className,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    if (await copyText(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div
      className={cn(
        'bg-muted/60 flex items-start gap-2 rounded-md border px-3 py-2',
        disabled && 'opacity-60',
        className
      )}
    >
      <code
        className={cn(
          'flex-1 font-mono text-[13px] leading-6 break-words select-all',
          block && 'whitespace-pre'
        )}
      >
        {value}
      </code>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        className='size-7 shrink-0'
        onClick={onCopy}
        disabled={disabled}
        aria-label='Copy'
      >
        {copied ? (
          <IconCheck className='size-4' />
        ) : (
          <IconCopy className='size-4' />
        )}
      </Button>
    </div>
  )
}
