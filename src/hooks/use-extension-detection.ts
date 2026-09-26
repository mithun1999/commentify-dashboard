import { useCallback, useEffect, useRef, useState } from 'react'
import {
  detectExtension,
  getExtensionState,
  type ExtensionState,
} from '@/lib/extension'

/**
 * Shared presence check for every surface that needs the extension. Runs the
 * bounded detection on mount (optionally), again on demand, and again when
 * the tab becomes visible - the moment a user comes back from installing or
 * enabling it. Concurrent checks are deduplicated inside `detectExtension`.
 */
export function useExtensionDetection(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true
  const [state, setState] = useState<ExtensionState>(() =>
    enabled ? getExtensionState() : { status: 'checking' }
  )
  const [isChecking, setIsChecking] = useState(false)
  const mounted = useRef(true)

  const recheck = useCallback(async () => {
    setIsChecking(true)
    setState({ status: 'checking' })
    try {
      const result = await detectExtension()
      if (mounted.current) setState(result.state)
      return result
    } finally {
      if (mounted.current) setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!enabled) return
    void recheck()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, recheck])

  return {
    state,
    isChecking: isChecking || state.status === 'checking',
    isReady: state.status === 'ready',
    isNotDetected:
      state.status === 'not-detected' || state.status === 'unsupported-browser',
    recheck,
  }
}
