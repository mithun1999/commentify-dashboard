import { useEffect, useRef } from 'react'

function useInitializeLemonSqueezy() {
  const isScriptLoaded = useRef<boolean>(false)

  const loadScript = async () => {
    if (!isScriptLoaded.current) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')

        script.src = 'https://app.lemonsqueezy.com/js/lemon.js'
        script.async = true

        script.onload = () => {
          isScriptLoaded.current = true
          resolve(true)
        }

        script.onerror = () => {
          reject(new Error('Failed to load the script'))
        }

        document.body.appendChild(script)
      })
    }
  }

  const initializeLs = async () => {
    await loadScript()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    window.createLemonSqueezy()
  }

  useEffect(() => {
    initializeLs()
    // We intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default useInitializeLemonSqueezy


