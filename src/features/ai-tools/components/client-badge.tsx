import { cn } from '@/lib/utils'

const COLORS: Record<string, string> = {
  Claude: 'bg-[#D97757] text-white',
  'Claude Code': 'bg-[#D97757] text-white',
  ChatGPT: 'bg-black text-white dark:bg-white dark:text-black',
  Cursor: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
  'VS Code': 'bg-[#007ACC] text-white',
}

/** A small square mark for an AI app: its initials, in roughly its colour. */
export function ClientBadge({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
        COLORS[name] ?? 'bg-muted text-foreground',
        className
      )}
    >
      {initials}
    </div>
  )
}
