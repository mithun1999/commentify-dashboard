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
      chrome.runtime.sendMessage(
        envConfig.chromeExtensionId,
        { type: LINK_LI_ACCOUNT },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message)
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
      chrome.runtime.sendMessage(
        envConfig.chromeExtensionId,
        { type: GET_PROFILE_DETAILS },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message)
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
