import { envConfig } from '@/config/env.config'
import {
  GET_PROFILE_DETAILS,
  LINK_LI_ACCOUNT,
} from '@/constant/browserEvents.constant'
import { QueryService } from '@/services/query.service'
import { type ClassValue, clsx } from 'clsx'
import { toast } from 'react-toastify'
import { twMerge } from 'tailwind-merge'
import { IProfileResponseFromExtension } from '@/features/auth/interface/user.interface'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export const linkLinkedInProfileFromExtension = async (): 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      toast('Connected', { type: 'success' })
      queryClient.invalidateQueries({
          queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        })
    } else if (response?.errorCode && response?.message) {
      toast(response.message, { type: 'error' })
    } else if (response?.message) {
      toast(response.message, { type: 'info' })
    } else {
      window.open('https://www.linkedin.com', '_blank')
    }
  } 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (error: any) {
    toast(error ?? error?.message ?? 'Something went wrong while connected', {
      type: 'error',
    })
    window.open('https://www.linkedin.com', '_blank')
  }
}
