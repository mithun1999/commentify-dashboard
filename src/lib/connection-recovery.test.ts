import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  LinkConfirmationUncertainError,
  ProfileReconnectRequiredError,
  buildQueryErrorToastId,
  classifyProfileListState,
  findExpectedProfile,
  getApiErrorCode,
  getAxiosStatus,
  getReadableErrorMessage,
  isAmbiguousMutationFailure,
  isSessionExpiredError,
  queryHasCachedData,
  shouldSuppressGlobalErrorNotice,
  toReconnectRequiredError,
} from './connection-recovery'
import type { IProfile } from '@/features/users/interface/profile.interface'

function axiosErrorWithStatus(status: number | undefined, data?: unknown) {
  const error = new AxiosError('Request failed')
  if (status !== undefined) {
    error.response = {
      status,
      data,
      statusText: '',
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: {} as any,
    }
  }
  return error
}

describe('shouldSuppressGlobalErrorNotice', () => {
  it('suppresses when meta flag is explicitly true', () => {
    expect(
      shouldSuppressGlobalErrorNotice({
        meta: { suppressGlobalErrorToast: true },
      })
    ).toBe(true)
  })

  it('does not suppress when meta is absent', () => {
    expect(shouldSuppressGlobalErrorNotice({ meta: undefined })).toBe(false)
  })

  it('does not suppress when the flag is false or something else', () => {
    expect(
      shouldSuppressGlobalErrorNotice({
        meta: { suppressGlobalErrorToast: false },
      })
    ).toBe(false)
    expect(shouldSuppressGlobalErrorNotice({ meta: { other: 'value' } })).toBe(
      false
    )
  })
})

describe('getAxiosStatus / isSessionExpiredError', () => {
  it('reads the status off an AxiosError', () => {
    expect(getAxiosStatus(axiosErrorWithStatus(500))).toBe(500)
  })

  it('returns undefined for non-Axios errors', () => {
    expect(getAxiosStatus(new Error('boom'))).toBeUndefined()
    expect(getAxiosStatus('nope')).toBeUndefined()
  })

  it('flags 401 as session-expired and nothing else', () => {
    expect(isSessionExpiredError(axiosErrorWithStatus(401))).toBe(true)
    expect(isSessionExpiredError(axiosErrorWithStatus(500))).toBe(false)
    expect(isSessionExpiredError(axiosErrorWithStatus(403))).toBe(false)
    expect(isSessionExpiredError(new Error('boom'))).toBe(false)
  })
})

describe('getReadableErrorMessage', () => {
  it('prefers the backend title, then message, then axios message', () => {
    expect(
      getReadableErrorMessage(axiosErrorWithStatus(500, { title: 'Down' }))
    ).toBe('Down')
    expect(
      getReadableErrorMessage(
        axiosErrorWithStatus(500, { message: 'Broke' })
      )
    ).toBe('Broke')
  })

  it('falls back to a generic message for unknown errors', () => {
    expect(getReadableErrorMessage('nope')).toBe(
      'Something went wrong. Please try again.'
    )
    expect(getReadableErrorMessage('nope', 'custom fallback')).toBe(
      'custom fallback'
    )
  })

  it('uses a plain Error message when present', () => {
    expect(getReadableErrorMessage(new Error('plain failure'))).toBe(
      'plain failure'
    )
  })
})

describe('buildQueryErrorToastId', () => {
  it('is stable for the same query key so sonner dedupes instead of stacking', () => {
    const a = buildQueryErrorToastId(['get-all-profile'])
    const b = buildQueryErrorToastId(['get-all-profile'])
    expect(a).toBe(b)
  })

  it('differs for different query keys', () => {
    expect(buildQueryErrorToastId(['a'])).not.toBe(
      buildQueryErrorToastId(['b'])
    )
  })
})

describe('queryHasCachedData', () => {
  it('is true once data has been set, false before the first success', () => {
    expect(queryHasCachedData({ state: { data: [] } as never })).toBe(true)
    expect(
      queryHasCachedData({ state: { data: undefined } as never })
    ).toBe(false)
  })
})

describe('classifyProfileListState', () => {
  it('loading: no data yet, still fetching or not fetched', () => {
    expect(
      classifyProfileListState({
        isLoading: true,
        isError: false,
        isFetched: false,
        data: undefined,
      })
    ).toBe('loading')
  })

  it('load-error: initial failure with nothing cached (A-04)', () => {
    expect(
      classifyProfileListState({
        isLoading: false,
        isError: true,
        isFetched: true,
        data: undefined,
      })
    ).toBe('load-error')
  })

  it('empty: a successful response with zero profiles', () => {
    expect(
      classifyProfileListState({
        isLoading: false,
        isError: false,
        isFetched: true,
        data: [],
      })
    ).toBe('empty')
  })

  it('ready: has cached profiles, regardless of a concurrent background error (A-05)', () => {
    expect(
      classifyProfileListState({
        isLoading: false,
        isError: true,
        isFetched: true,
        data: [{ _id: '1' }],
      })
    ).toBe('ready')
  })

  it('does not downgrade a cached empty list to load-error on a background failure', () => {
    // The last confirmed state was "no accounts"; a background refresh
    // failure afterwards must not be reinterpreted as an unresolved error.
    expect(
      classifyProfileListState({
        isLoading: false,
        isError: true,
        isFetched: true,
        data: [],
      })
    ).toBe('empty')
  })
})

describe('isAmbiguousMutationFailure', () => {
  it('treats 5xx as ambiguous (write may have persisted)', () => {
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(500))).toBe(true)
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(503))).toBe(true)
  })

  it('treats a response-less axios error (timeout/network drop) as ambiguous', () => {
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(undefined))).toBe(
      true
    )
  })

  it('treats a definitive 4xx as not ambiguous', () => {
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(400))).toBe(false)
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(401))).toBe(false)
    expect(isAmbiguousMutationFailure(axiosErrorWithStatus(422))).toBe(false)
  })

  it('treats a non-axios error as ambiguous by default (safer than assuming failure)', () => {
    expect(isAmbiguousMutationFailure(new Error('boom'))).toBe(true)
  })
})

describe('LinkConfirmationUncertainError', () => {
  it('carries the original cause and an explicit uncertain message', () => {
    const original = axiosErrorWithStatus(500)
    const err = new LinkConfirmationUncertainError(original)
    expect(err.cause).toBe(original)
    expect(err.message).toMatch(/couldn.t confirm/i)
    expect(err.name).toBe('LinkConfirmationUncertainError')
  })
})

describe('getApiErrorCode / toReconnectRequiredError', () => {
  it('reads the stable code off a 409 body and carries the identity through', () => {
    const error = axiosErrorWithStatus(409, {
      code: 'PROFILE_RECONNECT_REQUIRED',
      message: 'Disconnected',
      profile: { publicIdentifier: 'jane', platform: 'linkedin' },
    })
    expect(getApiErrorCode(error)).toBe('PROFILE_RECONNECT_REQUIRED')
    const converted = toReconnectRequiredError(error)
    expect(converted).toBeInstanceOf(ProfileReconnectRequiredError)
    expect(converted?.profile.publicIdentifier).toBe('jane')
    expect(converted?.message).toBe('Disconnected')
  })

  it('ignores errors without that code', () => {
    expect(toReconnectRequiredError(axiosErrorWithStatus(409, { code: 'OTHER' }))).toBeNull()
    expect(toReconnectRequiredError(axiosErrorWithStatus(500))).toBeNull()
    expect(toReconnectRequiredError(new Error('x'))).toBeNull()
    expect(getApiErrorCode(new Error('x'))).toBeUndefined()
  })
})

describe('findExpectedProfile', () => {
  const profile = (overrides: Partial<IProfile>): IProfile =>
    ({ _id: 'p', status: 'ok', profileUrn: 'urn:1', ...overrides }) as IProfile

  // A-07: reconciliation identifies the expected account without a second POST.
  it('matches the expected LinkedIn identity in a connected state', () => {
    const match = findExpectedProfile([profile({ _id: 'a' })], { profileUrn: 'urn:1' })
    expect(match?._id).toBe('a')
  })

  it('matches X by twitterUserId', () => {
    const match = findExpectedProfile(
      [profile({ _id: 'x', platform: 'twitter', twitterUserId: '42', profileUrn: '42' })],
      { twitterUserId: '42' }
    )
    expect(match?._id).toBe('x')
  })

  // The mere presence of an older record is not proof the write landed.
  it('does not accept an account that is not in a connected state', () => {
    expect(
      findExpectedProfile([profile({ status: 'action-required' as IProfile['status'] })], {
        profileUrn: 'urn:1',
      })
    ).toBeUndefined()
  })

  it('returns undefined for a different identity, no data, or no expectation', () => {
    expect(findExpectedProfile([profile({})], { profileUrn: 'urn:2' })).toBeUndefined()
    expect(findExpectedProfile(undefined, { profileUrn: 'urn:1' })).toBeUndefined()
    expect(findExpectedProfile([profile({})], {})).toBeUndefined()
  })
})
