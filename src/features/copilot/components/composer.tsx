import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ComposerProps {
  onSubmit: (text: string) => void
  busy?: boolean
  onStop?: () => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /** Floor for the box, in px, once the user engages with it. */
  focusedHeight?: number
  /** Openers revealed while the box is focused and still empty. */
  suggestionsOnFocus?: string[]
}

const MAX_HEIGHT = 180

/**
 * The one input, used by the thread, the new-chat screen and the hub dock.
 * It owns its draft so every surface behaves the same: Enter sends, Shift+Enter
 * breaks the line, and the box grows with the text up to a point.
 */
export function Composer({
  onSubmit,
  busy = false,
  onStop,
  placeholder = 'Ask for a change...',
  autoFocus = false,
  className,
  focusedHeight = 0,
  suggestionsOnFocus,
}: ComposerProps) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(autoFocus)
  const ref = useRef<HTMLTextAreaElement>(null)

  const engaged = focused || draft.length > 0
  // Once there is a draft the openers are in the way — the user has their own
  // question and the room is better spent on it.
  const showSuggestions = Boolean(suggestionsOnFocus) && focused && !draft

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Measuring means collapsing to `auto` first, or the box could only ever
    // grow. The floor lives here rather than in a `min-h` class for the same
    // reason: a CSS minimum inflates `scrollHeight` and hides the real content.
    const previous = el.style.height
    el.style.height = 'auto'
    const content = el.scrollHeight
    // Put the old height back and flush before applying the new one. A
    // transition interpolates between two lengths, and a frame that passes
    // through `auto` leaves it nothing to start from, so it would just jump.
    el.style.height = previous
    void el.offsetHeight
    const floor = engaged ? focusedHeight : 0
    el.style.height = `${Math.min(Math.max(content, floor), MAX_HEIGHT)}px`
  }, [draft, engaged, focusedHeight])

  // Takes the text rather than reading state, so Enter can send what is in the
  // box even on the keystroke that put it there — the element's value is the
  // draft, and waiting for the state round-trip only invites a lost message.
  const submit = (value: string) => {
    const text = value.trim()
    if (!text || busy) return
    setDraft('')
    onSubmit(text)
  }

  return (
    <div>
      {showSuggestions && (
        <div className='animate-in fade-in-0 slide-in-from-bottom-1 mb-2 flex flex-wrap justify-center gap-2 duration-200'>
          {suggestionsOnFocus?.map((suggestion) => (
            <button
              key={suggestion}
              // Without this the textarea blurs on press, the list unmounts,
              // and the click lands on nothing.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(suggestion)}
              className='bg-background text-muted-foreground hover:text-foreground hover:bg-muted rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors'
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'bg-background focus-within:border-ring relative rounded-xl border shadow-sm transition-colors',
          className
        )}
      >
        <textarea
          ref={ref}
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit(e.currentTarget.value)
            }
          }}
          rows={1}
          placeholder={placeholder}
          className='placeholder:text-muted-foreground w-full resize-none bg-transparent py-3 ps-4 pe-12 text-sm transition-[height] duration-200 ease-out outline-none'
        />
        <Button
          size='icon'
          className='absolute end-2 bottom-2 size-8 rounded-lg'
          // Keep the caret where it was so sending does not collapse the box
          // out from under the pointer, and the next question can just be typed.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (busy ? onStop?.() : submit(draft))}
          disabled={!busy && !draft.trim()}
          aria-label={busy ? 'Stop' : 'Send'}
        >
          {busy ? <Square className='size-3' /> : <ArrowUp className='size-4' />}
        </Button>
      </div>
    </div>
  )
}
