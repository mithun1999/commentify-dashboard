import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  awaitSettingsSaved,
  beginSave,
  resetDerivationStateForTest,
  retryFailedSave,
} from '../hooks/useDeriveOnboardingSettings'
import { MAX_TOPICS, parseTopics, setupHoldAction } from './setup-hold'

vi.mock('@/stores/onboarding.store', () => ({ useOnboarding: vi.fn() }))
vi.mock('@/features/linkedin-sales/api/sales.api', () => ({}))
vi.mock('@/features/users/query/profile.query', () => ({
  ProfileQueryEnum: {},
}))
vi.mock('../api/onboarding.api', () => ({}))

describe('setupHoldAction', () => {
  it('lets a finished setup through', () => {
    expect(
      setupHoldAction({
        setupFailed: false,
        askingForTopics: false,
        topics: [],
      })
    ).toBe('proceed')
  })

  it('retries first when the save failed', () => {
    expect(
      setupHoldAction({ setupFailed: true, askingForTopics: false, topics: [] })
    ).toBe('retry')
  })

  it('stays put while the topics field is empty', () => {
    expect(
      setupHoldAction({ setupFailed: true, askingForTopics: true, topics: [] })
    ).toBe('ask-for-topics')
  })

  it('saves what the person typed', () => {
    expect(
      setupHoldAction({
        setupFailed: true,
        askingForTopics: true,
        topics: ['stock trading'],
      })
    ).toBe('save-typed-topics')
  })

  it('never proceeds while setup is failed, whatever else is true', () => {
    for (const askingForTopics of [true, false]) {
      for (const topics of [[], ['a']]) {
        expect(
          setupHoldAction({ setupFailed: true, askingForTopics, topics })
        ).not.toBe('proceed')
      }
    }
  })
})

describe('parseTopics', () => {
  it('splits on commas and new lines and trims', () => {
    expect(parseTopics(' stock trading, options\nrisk   management ;')).toEqual(
      ['stock trading', 'options', 'risk management']
    )
  })

  it('drops repeats regardless of case', () => {
    expect(parseTopics('SaaS, saas, Sales')).toEqual(['SaaS', 'Sales'])
  })

  it('is empty for blank input', () => {
    expect(parseTopics('  , \n ')).toEqual([])
  })

  it('caps the list', () => {
    expect(parseTopics('a,b,c,d,e,f,g,h')).toHaveLength(MAX_TOPICS)
  })
})

describe('retrying a failed save', () => {
  beforeEach(() => resetDerivationStateForTest())

  it('runs again after a failure and clears the hold when it lands', async () => {
    const run = vi
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('keywordsToTarget should not be empty'))
      .mockResolvedValueOnce()

    await expect(beginSave('p1', run)).rejects.toThrow()
    await expect(awaitSettingsSaved('p1')).rejects.toThrow()

    await expect(retryFailedSave('p1', run)).resolves.toBeUndefined()
    expect(run).toHaveBeenCalledTimes(2)
    await expect(awaitSettingsSaved('p1')).resolves.toBeUndefined()
  })

  it('keeps holding when the retry fails too', async () => {
    const run = vi
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValue(new Error('nope'))

    await expect(beginSave('p1', run)).rejects.toThrow()
    await expect(retryFailedSave('p1', run)).rejects.toThrow('nope')
    await expect(awaitSettingsSaved('p1')).rejects.toThrow('nope')
  })

  it('does not write twice when the save already landed', async () => {
    const run = vi.fn<(id: string) => Promise<void>>().mockResolvedValue()

    await beginSave('p1', run)
    await retryFailedSave('p1', run, ['ignored'])
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not start a second save while one is in flight', async () => {
    let finish!: () => void
    const run = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))

    const first = beginSave('p1', run)
    const second = retryFailedSave('p1', run)
    finish()
    await Promise.all([first, second])
    expect(run).toHaveBeenCalledTimes(1)
  })
})
