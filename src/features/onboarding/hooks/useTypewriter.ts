import { useCallback, useEffect, useRef, useState } from 'react'

/** Long enough to read as writing, short enough that nobody waits on it. */
const CHARS_PER_TICK = 3
const TICK_MS = 16

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * Reveals text a few characters at a time, the way a model appears to write.
 *
 * The text it is given arrives complete - the draft is polled, and a comment
 * arrives on the stream in one piece - so this is a reveal rather than real
 * token streaming. It exists because a paragraph that appears all at once after
 * minutes of a spinner reads as a page load, not as something being written.
 *
 * Typing only ever runs once per string. Both callers re-render on a poll or a
 * stream event, and restarting from empty on each of those would erase what the
 * user was mid-sentence on.
 */
export function useTypewriter(text: string | undefined) {
  const [shown, setShown] = useState('')
  const typed = useRef<string | null>(null)
  const stop = useRef<(() => void) | null>(null)

  /** Jump to the end - for when the rest of the text is no longer visible. */
  const finish = useCallback(() => stop.current?.(), [])

  useEffect(() => {
    if (!text) {
      typed.current = null
      setShown('')
      return
    }
    if (typed.current === text) return
    typed.current = text

    if (prefersReducedMotion()) {
      setShown(text)
      return
    }

    let count = 0
    setShown('')
    const timer = setInterval(() => {
      count = Math.min(count + CHARS_PER_TICK, text.length)
      setShown(text.slice(0, count))
      if (count >= text.length) clearInterval(timer)
    }, TICK_MS)
    stop.current = () => {
      clearInterval(timer)
      setShown(text)
    }
    return () => {
      clearInterval(timer)
      stop.current = null
    }
  }, [text])

  return { shown, done: !!text && shown.length >= text.length, finish }
}
