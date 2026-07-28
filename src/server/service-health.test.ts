import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isProcessRunningMock = vi.fn()

vi.mock('./gateway-capabilities', () => ({
  CLAUDE_API: 'http://127.0.0.1:8642',
  CLAUDE_DASHBOARD_URL: 'http://127.0.0.1:9119',
}))

vi.mock('./process-monitor', () => ({
  isProcessRunning: (...args: Array<unknown>) => isProcessRunningMock(...args),
}))

const originalFetch = globalThis.fetch

beforeEach(() => {
  isProcessRunningMock.mockReset()
  delete process.env.NINE_ROUTER_URL
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('checkAllServices', () => {
  it('reports every HTTP service up when fetch succeeds, and Caddy up when the process is found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    isProcessRunningMock.mockResolvedValue(true)

    const { checkAllServices } = await import('./service-health')
    const results = await checkAllServices()

    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    expect(byName['Hermes Gateway'].status).toBe('up')
    expect(byName['Hermes Dashboard'].status).toBe('up')
    expect(byName['9router'].status).toBe('up')
    expect(byName['Caddy'].status).toBe('up')
    expect(byName['LAM Cyberlab Workspace'].status).toBe('up')
  })

  it('treats a non-2xx HTTP response as reachable (something is answering)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }))
    isProcessRunningMock.mockResolvedValue(false)

    const { checkAllServices } = await import('./service-health')
    const results = await checkAllServices()
    const gateway = results.find((r) => r.name === 'Hermes Gateway')
    expect(gateway?.status).toBe('up')
  })

  it('reports down when fetch throws (connection refused / timeout)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    isProcessRunningMock.mockResolvedValue(false)

    const { checkAllServices } = await import('./service-health')
    const results = await checkAllServices()

    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    expect(byName['Hermes Gateway'].status).toBe('down')
    expect(byName['Hermes Gateway'].latencyMs).toBeNull()
    expect(byName['Hermes Dashboard'].status).toBe('down')
    expect(byName['9router'].status).toBe('down')
  })

  it('reports Caddy down when no matching process is found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    isProcessRunningMock.mockResolvedValue(false)

    const { checkAllServices } = await import('./service-health')
    const results = await checkAllServices()
    expect(results.find((r) => r.name === 'Caddy')?.status).toBe('down')
    expect(isProcessRunningMock).toHaveBeenCalledWith('caddy')
  })

  it('honors NINE_ROUTER_URL override', async () => {
    process.env.NINE_ROUTER_URL = 'http://127.0.0.1:9999'
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock
    isProcessRunningMock.mockResolvedValue(true)

    const { checkAllServices } = await import('./service-health')
    await checkAllServices()

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(calledUrls.some((u) => u.startsWith('http://127.0.0.1:9999'))).toBe(true)
  })
})
