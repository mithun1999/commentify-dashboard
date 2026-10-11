import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import {
  getAuthToken,
  refreshAuthToken,
  signOut,
} from '@/features/auth/utils/auth.util'
import { envConfig } from '../config/env.config'

export const axiosInstance = axios.create({
  baseURL: envConfig.apiUrl,
})

export const axiosInstanceWithoutToken = axios.create({
  baseURL: envConfig.apiUrl,
})

type AuthRetryConfig = InternalAxiosRequestConfig & { authRetried?: boolean }

/**
 * What axiosInstance rejects with in place of the AxiosError. `status` is the
 * HTTP status, or the axios error code when no response came back; `message`
 * is the backend message, already flattened to one string. `body` is the
 * response body as sent, so callers can read the backend's
 * machine-readable `code` (see src/lib/connection-recovery.ts).
 */
export type ApiRequestError = {
  status: number | string
  message: string
  body?: unknown
}

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (request) => {
    if (request.headers) {
      request.headers.Authorization = `Bearer ${await getAuthToken()}`
    }
    return request
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    if (error.response) {
      const statusCode = error.response.status
      const statusText =
        error.response.data?.message ||
        error.response.statusText ||
        error.message ||
        'Something went wrong'

      let formattedStatus: string

      if (Array.isArray(statusText)) {
        formattedStatus = statusText.join(', ')
      } else {
        formattedStatus = String(statusText)
      }

      const formattedError: ApiRequestError = {
        status: statusCode,
        message: formattedStatus,
        body: error.response.data,
      }
      const config = error.config as AuthRetryConfig | undefined

      // A 401 usually means the token expired or was rotated while the request
      // was in flight. Refresh and replay once; sign out only when the session
      // can't be recovered.
      if (statusCode === 401 && config && !config.authRetried) {
        config.authRetried = true
        const rejectedToken = String(
          config.headers?.Authorization ?? ''
        ).replace(/^Bearer /, '')

        let token: string | null
        try {
          token = await refreshAuthToken(rejectedToken)
        } catch {
          // Supabase unreachable: keep the session, just fail this request.
          return Promise.reject(formattedError)
        }

        if (token) return axiosInstance(config)
      }

      if (statusCode === 401) {
        signOut()
      }

      return Promise.reject(formattedError)
    }

    const networkError: ApiRequestError = {
      status: error.code || 'UNKNOWN',
      message: error.message || 'An unknown error occurred',
    }
    return Promise.reject(networkError)
  }
)
