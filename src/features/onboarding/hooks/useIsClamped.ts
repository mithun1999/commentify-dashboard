import { useEffect, useRef, useState } from 'react'

/**
 * Reports whether an element is actually cutting text off, so a "show more"
 * affordance is only offered when there is more to show. The same string wraps
 * differently at different widths, which is why this is measured on every
 * resize rather than guessed from the character count.
 */
export function useIsClamped<T extends HTMLElement>(content: unknown) {
  const ref = useRef<T>(null)
  const [clamped, setClamped] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [content])

  return { ref, clamped }
}
