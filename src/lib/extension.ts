import { envConfig } from '@/config/env.config'

interface ExtensionDetectionResult {
  installed: boolean
  activeExtensionId: string | null
}

let cachedExtensionId: string | null = null

function probeExtension(extensionId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = `chrome-extension://${extensionId}/${envConfig.chromeExtensionIconUrl}`
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
  })
}

export async function detectExtension(): Promise<ExtensionDetectionResult> {
  const [webStoreInstalled, manualInstalled] = await Promise.all([
    probeExtension(envConfig.chromeWebStoreExtensionId),
    probeExtension(envConfig.chromeExtensionId),
  ])

  if (webStoreInstalled) {
    cachedExtensionId = envConfig.chromeWebStoreExtensionId
    return { installed: true, activeExtensionId: cachedExtensionId }
  }

  if (manualInstalled) {
    cachedExtensionId = envConfig.chromeExtensionId
    return { installed: true, activeExtensionId: cachedExtensionId }
  }

  return { installed: false, activeExtensionId: null }
}

export function getActiveExtensionId(): string {
  return cachedExtensionId ?? envConfig.chromeExtensionId
}
