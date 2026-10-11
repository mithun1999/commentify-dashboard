import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { axiosInstance } from './axios.util'
import { handleServerError } from './handle-server-error'

vi.mock('@/features/auth/utils/auth.util', () => ({
  getAuthToken: async () => 'token',
  refreshAuthToken: async () => null,
  signOut: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const POSTING_LIMIT =
  "You've reached your posting profile limit. Add more posting profiles from the Plans page, or remove posting from another profile."

describe('handleServerError', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it("shows the backend's message for an axiosInstance rejection", async () => {
    const error = await axiosInstance({
      method: 'PATCH',
      url: '/profile/p1/agent-types',
      adapter: async (config) => {
        throw new AxiosError(
          'Request failed with status code 400',
          AxiosError.ERR_BAD_REQUEST,
          config,
          null,
          {
            status: 400,
            statusText: '',
            data: { message: POSTING_LIMIT, error: 'Bad Request', statusCode: 400 },
            headers: {},
            config,
          }
        )
      },
    }).catch((e: unknown) => e)

    handleServerError(error)

    expect(toast.error).toHaveBeenCalledWith(POSTING_LIMIT)
  })

  it('keeps the fallback for errors that are not API failures', () => {
    handleServerError(new TypeError('x is undefined'))

    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })
})
