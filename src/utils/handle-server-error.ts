import { AxiosError } from 'axios'
import { toast } from 'sonner'
import {
  getReadableErrorMessage,
  isApiRequestError,
} from '@/lib/connection-recovery'

export function handleServerError(error: unknown) {
  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  // axiosInstance rejects with a plain ApiRequestError, not the AxiosError, so
  // checking for AxiosError alone replaced every backend message with the
  // fallback.
  if (error instanceof AxiosError || isApiRequestError(error)) {
    errMsg = getReadableErrorMessage(error, errMsg)
  }

  toast.error(errMsg)
}
