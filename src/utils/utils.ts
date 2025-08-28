import { envConfig } from '@/config/env.config'
import { QueryService } from '@/services/query.service'
import { toast } from 'sonner'
import {
  GET_PROFILE_DETAILS,
  LINK_LI_ACCOUNT,
} from '../features/users/constants/browserEvents.constant'
import { IProfileResponseFromExtension } from '../features/users/interface/profile.interface'
import { ProfileQueryEnum } from '../features/users/query/profile.query'

export const checkIsExtensionInstalled = async (
  extensionId: string,
  extensionIconUrl: string
): Promise<boolean> => {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = `chrome-extension://${extensionId}/${extensionIconUrl}`
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
  })
}

export const linkLinkedInProfileFromExtension =
  async (): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<any> => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeRef: any = typeof window !== 'undefined' ? (window as any).chrome : undefined
      const runtime = chromeRef?.runtime
      const sendMessage = runtime?.sendMessage

      if (typeof sendMessage !== 'function') {
        reject(new Error('Chrome extension runtime is not available'))
        return
      }

      sendMessage(
        envConfig.chromeExtensionId,
        { type: LINK_LI_ACCOUNT },
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

export const getProfileDetailsFromExtension =
  async (): Promise<IProfileResponseFromExtension> => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeRef: any = typeof window !== 'undefined' ? (window as any).chrome : undefined
      const runtime = chromeRef?.runtime
      const sendMessage = runtime?.sendMessage

      if (typeof sendMessage !== 'function') {
        reject(new Error('Chrome extension runtime is not available'))
        return
      }

      sendMessage(
        envConfig.chromeExtensionId,
        { type: GET_PROFILE_DETAILS },
        (response: IProfileResponseFromExtension) => {
          if (runtime?.lastError) {
            reject(runtime.lastError.message)
          } else {
            resolve(response)
          }
        }
      )
    })
  }

export const handleResponseFromExtension = async () => {
  const queryClient = QueryService.getQueryClient()
  try {
    const response = await linkLinkedInProfileFromExtension()
    if (response?.profileUrn) {
      toast.success('Connected')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
    } else if (response?.errorCode && response?.message) {
      toast.error(response.message)
    } else if (response?.message) {
      toast.message(response.message)
    } else {
      window.open('https://www.linkedin.com', '_blank')
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Something went wrong while connecting'

    toast.error(errorMessage)

    window.open('https://www.linkedin.com', '_blank')
  }
}
