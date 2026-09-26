import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyHandshakeResponse,
  detectExtension,
  invalidateExtensionId,
  probeExtensionOnce,
  type ChromeRuntimeLike,
} from './extension'

type Reply = { response?: unknown; lastError?: { message: string } } | 'hang'

/** A fake `chrome.runtime` whose behaviour is scripted per extension id. */
function fakeRuntime(script: Record<string, Reply | Reply[]>): ChromeRuntimeLike {
  const runtime: ChromeRuntimeLike = {
    lastError: undefined,
    sendMessage: (...args: unknown[]) => {
      const [extensionId, , callback] = args as [string, unknown, (r: unknown) => void]
      const entry = script[extensionId]
      const reply = Array.isArray(entry) ? (entry.shift() ?? 'hang') : entry
      if (reply === 'hang' || reply === undefined) return
      setTimeout(() => {
        runtime.lastError = reply.lastError
        callback(reply.response)
        runtime.lastError = undefined
      }, 0)
    },
  }
  return runtime
}

const HANDSHAKE = { commentify: true, version: '1.2.3', capabilities: ['handshake'] }
const LEGACY = { errorCode: 'unknown-message-type', message: 'Unknown message type' }
const NO_RECEIVER = { lastError: { message: 'Could not establish connection. Receiving end does not exist.' } }

beforeEach(() => {
  vi.useFakeTimers()
  invalidateExtensionId()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('classifyHandshakeResponse', () => {
  it('accepts only the handshake or the verified legacy error object', () => {
    expect(classifyHandshakeResponse(HANDSHAKE)).toEqual({
      ok: true,
      legacy: false,
      version: '1.2.3',
    })
    expect(classifyHandshakeResponse(LEGACY)).toEqual({ ok: true, legacy: true })
    // B-11 / B-04: arbitrary objects are not a detection.
    expect(classifyHandshakeResponse({ profileUrn: 'x' })).toEqual({
      ok: false,
      reason: 'unreachable',
    })
    expect(classifyHandshakeResponse(undefined).ok).toBe(false)
    expect(classifyHandshakeResponse('ok').ok).toBe(false)
  })
})

describe('probeExtensionOnce', () => {
  it('settles once with the reply and clears its timer', async () => {
    const runtime = fakeRuntime({ ext: { response: HANDSHAKE } })
    const pending = probeExtensionOnce('ext', runtime, 2000)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toEqual({ ok: true, legacy: false, version: '1.2.3' })
  })

  it('reports a runtime error as unreachable', async () => {
    const runtime = fakeRuntime({ ext: NO_RECEIVER })
    const pending = probeExtensionOnce('ext', runtime, 2000)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toEqual({ ok: false, reason: 'unreachable' })
  })

  it('times out a silent candidate within the budget', async () => {
    const runtime = fakeRuntime({ ext: 'hang' })
    const pending = probeExtensionOnce('ext', runtime, 2000)
    await vi.advanceTimersByTimeAsync(2001)
    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' })
  })
})

describe('detectExtension', () => {
  const opts = { candidateIds: ['store', 'manual'], timeoutMs: 2000, retries: 1, withIconProbe: false }

  // B-01 / B-02
  it('resolves to the responding candidate and uses that id afterwards', async () => {
    const runtime = fakeRuntime({ store: NO_RECEIVER, manual: { response: HANDSHAKE } })
    const pending = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(5)
    const result = await pending
    expect(result.installed).toBe(true)
    expect(result.activeExtensionId).toBe('manual')
    expect(result.state).toMatchObject({ status: 'ready', extensionId: 'manual', legacy: false })
  })

  // B-03: a hung candidate must not block the working one.
  it('prefers the Web Store install and is not blocked by a hung manual candidate', async () => {
    const runtime = fakeRuntime({ store: { response: HANDSHAKE }, manual: 'hang' })
    const pending = detectExtension({ ...opts, runtime })
    // Both probes run concurrently; the hung one exhausts timeout + retry.
    await vi.advanceTimersByTimeAsync(4100)
    const result = await pending
    expect(result.activeExtensionId).toBe('store')
  })

  // B-04: an older package is reachable through the legacy signal.
  it('treats the legacy unknown-message reply as reachable but legacy', async () => {
    const runtime = fakeRuntime({ store: NO_RECEIVER, manual: { response: LEGACY } })
    const pending = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(5)
    const result = await pending
    expect(result.state).toMatchObject({ status: 'ready', legacy: true })
  })

  // B-05: bounded budget, then a recoverable answer.
  it('gives up within timeout x (1 + retries) per candidate when nothing answers', async () => {
    const runtime = fakeRuntime({ store: 'hang', manual: 'hang' })
    const pending = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(4100)
    const result = await pending
    expect(result.installed).toBe(false)
    expect(result.state).toMatchObject({ status: 'not-detected', reason: 'timeout' })
  })

  // B-06: a cold service worker that answers on the retry.
  it('retries a timed-out candidate once and succeeds if it answers the second time', async () => {
    const runtime = fakeRuntime({ store: ['hang', { response: HANDSHAKE }], manual: NO_RECEIVER })
    const pending = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(2100)
    const result = await pending
    expect(result.state).toMatchObject({ status: 'ready', extensionId: 'store' })
  })

  it('does not retry a hard "no receiver" error', async () => {
    const runtime = fakeRuntime({ store: NO_RECEIVER, manual: NO_RECEIVER })
    const sendSpy = vi.spyOn(runtime, 'sendMessage')
    const pending = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(5)
    const result = await pending
    expect(result.state).toMatchObject({ status: 'not-detected', reason: 'unreachable' })
    expect(sendSpy).toHaveBeenCalledTimes(2)
  })

  // B-09
  it('reports an unsupported browser when there is no messaging runtime', async () => {
    const result = await detectExtension({ ...opts, runtime: {} })
    expect(result.state).toEqual({ status: 'unsupported-browser' })
  })

  it('deduplicates concurrent checks into one probe per candidate', async () => {
    const runtime = fakeRuntime({ store: { response: HANDSHAKE }, manual: NO_RECEIVER })
    const sendSpy = vi.spyOn(runtime, 'sendMessage')
    const a = detectExtension({ ...opts, runtime })
    const b = detectExtension({ ...opts, runtime })
    await vi.advanceTimersByTimeAsync(5)
    await Promise.all([a, b])
    expect(a).toBe(b)
    expect(sendSpy).toHaveBeenCalledTimes(2)
  })
})
