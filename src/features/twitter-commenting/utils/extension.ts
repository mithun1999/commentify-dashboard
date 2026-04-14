import { getActiveExtensionId } from '@/lib/extension'

const GET_TWITTER_PROFILE_DETAILS = 'get_twitter_profile_details'
const LINK_TWITTER_ACCOUNT = 'link_twitter_account'

export interface ITwitterProfileFromExtension {
  platform: 'twitter'
  authToken: string
  csrfToken: string
  cookieDump: string
  twitterUserId: string
  screenName: string
  displayName: string
  firstName: string
  lastName: string
  userAgent: string
  ja3Text?: string
}

function getChromeRuntime() {
  const chromeRef =
    typeof window !== 'undefined'
      ? (window as Window & { chrome?: { runtime?: { lastError?: { message: string }; sendMessage: (...args: unknown[]) => void } } }).chrome
      : undefined
  const runtime = chromeRef?.runtime
  const sendMessage = runtime?.sendMessage
  if (typeof sendMessage !== 'function') {
    throw new Error('Chrome extension runtime is not available')
  }
  return { runtime, sendMessage }
}

export async function getTwitterProfileDetailsFromExtension(): Promise<ITwitterProfileFromExtension> {
  const extensionId = getActiveExtensionId()
  console.log('[Twitter Extension] Requesting profile details...')
  console.log('[Twitter Extension] Extension ID:', extensionId)
  return new Promise((resolve, reject) => {
    try {
      const { runtime, sendMessage } = getChromeRuntime()
      console.log('[Twitter Extension] Chrome runtime available, sending message:', GET_TWITTER_PROFILE_DETAILS)
      sendMessage(
        extensionId,
        { type: GET_TWITTER_PROFILE_DETAILS },
        (response: ITwitterProfileFromExtension) => {
          console.log('[Twitter Extension] Got response:', response)
          console.log('[Twitter Extension] lastError:', runtime?.lastError)
          if (runtime?.lastError) {
            console.error('[Twitter Extension] Runtime error:', runtime.lastError.message)
            reject(runtime.lastError.message)
          } else {
            console.log('[Twitter Extension] Profile received:', {
              screenName: response?.screenName,
              displayName: response?.displayName,
              twitterUserId: response?.twitterUserId,
              platform: response?.platform,
            })
            resolve(response)
          }
        }
      )
    } catch (err) {
      console.error('[Twitter Extension] getChromeRuntime threw:', err)
      reject(err)
    }
  })
}

export async function linkTwitterAccountFromExtension(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const { runtime, sendMessage } = getChromeRuntime()
    sendMessage(
      getActiveExtensionId(),
      { type: LINK_TWITTER_ACCOUNT },
      (response: unknown) => {
        if (runtime?.lastError) {
          reject(runtime.lastError.message)
        } else {
          resolve(response)
        }
      }
    )
  })
}
