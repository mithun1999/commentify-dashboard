import { AxiosError, type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import {
  getApiErrorCode,
  getReadableErrorMessage,
  isAmbiguousMutationFailure,
} from '@/lib/connection-recovery'
import { axiosInstance } from './axios.util'

vi.mock('@/features/auth/utils/auth.util', () => ({
  getAuthToken: async () => 'token',
  refreshAuthToken: async () => null,
  signOut: vi.fn(),
}))

function respondWith(status: number, data: unknown): AxiosAdapter {
  return async (config) => {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      { status, statusText: '', data, headers: {}, config }
    )
  }
}

async function rejectionOf(adapter: AxiosAdapter): Promise<unknown> {
  return axiosInstance({ method: 'POST', url: '/profile/link', adapter }).then(
    () => {
      throw new Error('expected the request to fail')
    },
    (error: unknown) => error
  )
}

describe('axiosInstance rejections', () => {
  it('keep a 4xx definitive and its backend message readable', async () => {
    const message =
      'You have reached the maximum number of linked accounts. Please purchase additional slots or unlink an existing account to proceed.'
    const error = await rejectionOf(
      respondWith(400, { message, error: 'Bad Request', statusCode: 400 })
    )

    expect(isAmbiguousMutationFailure(error)).toBe(false)
    expect(getReadableErrorMessage(error)).toBe(message)
  })

  it('keep the machine-readable code from the body', async () => {
    const error = await rejectionOf(
      respondWith(409, { code: 'PROFILE_RECONNECT_REQUIRED', message: 'x' })
    )

    expect(getApiErrorCode(error)).toBe('PROFILE_RECONNECT_REQUIRED')
  })

  it('stay ambiguous when no response came back', async () => {
    const error = await rejectionOf(async (config) => {
      throw new AxiosError(
        'timeout of 1ms exceeded',
        AxiosError.ECONNABORTED,
        config
      )
    })

    expect(isAmbiguousMutationFailure(error)).toBe(true)
  })
})
