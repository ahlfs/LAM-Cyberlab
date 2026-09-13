import { describe, it, expect, vi } from 'vitest'
import { Route as ExtractRoute } from '../routes/api/study/extract'
import { Route as CommitRoute } from '../routes/api/study/commit'

vi.mock('../server/auth-middleware', () => ({
  isAuthenticated: vi.fn(() => true),
}))

vi.mock('../server/rate-limit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimit: vi.fn(() => true),
  rateLimitResponse: vi.fn(),
  safeErrorMessage: vi.fn((e) => (e instanceof Error ? e.message : String(e))),
}))

vi.mock('../server/study-service', () => ({
  extractContentFromUrl: vi.fn(async (url: string) => ({
    title: 'Extracted Title',
    content: 'Extracted Markdown Content',
    sourceUrl: url,
    size: 100,
  })),
  extractContentFromFile: vi.fn(async (file) => ({
    title: 'File Title',
    content: 'Extracted File Content',
    size: file.buffer.length,
  })),
  commitToSecondBrain: vi.fn(async (payload) => ({
    success: true,
    filePath: '/vault/03-Notes/Extracted-Docs/test.md',
    syncOutput: 'Sync complete',
  })),
}))

describe('Study API Routes', () => {
  describe('POST /api/study/extract', () => {
    it('handles JSON URL extraction request', async () => {
      const handler = (ExtractRoute.options as any).server?.handlers?.POST
      expect(handler).toBeDefined()

      const request = new Request('http://localhost/api/study/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })

      const response = await handler({ request })
      const json = await response.json()
      expect(json.ok).toBe(true)
      expect(json.data.title).toBe('Extracted Title')
    })
  })

  describe('POST /api/study/commit', () => {
    it('commits document to second brain', async () => {
      const handler = (CommitRoute.options as any).server?.handlers?.POST
      expect(handler).toBeDefined()

      const request = new Request('http://localhost/api/study/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Study Note',
          content: 'Important takeaways',
          tags: ['test'],
        }),
      })

      const response = await handler({ request })
      const json = await response.json()
      expect(json.ok).toBe(true)
      expect(json.data.filePath).toBe('/vault/03-Notes/Extracted-Docs/test.md')
    })
  })
})
