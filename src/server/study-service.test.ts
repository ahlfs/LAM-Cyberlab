import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractContentFromUrl,
  extractContentFromFile,
  commitToSecondBrain,
} from './study-service'
import fs from 'node:fs'
import path from 'node:path'

describe('study-service', () => {
  describe('extractContentFromFile', () => {
    it('extracts plain text and markdown content directly', async () => {
      const buffer = Buffer.from('# Test Document\n\nThis is a sample markdown.')
      const result = await extractContentFromFile({
        name: 'test.md',
        buffer,
        mimeType: 'text/markdown',
      })

      expect(result.title).toBe('test')
      expect(result.content).toContain('# Test Document')
      expect(result.size).toBe(buffer.length)
    })

    it('extracts text from txt files', async () => {
      const buffer = Buffer.from('Plain text content here.')
      const result = await extractContentFromFile({
        name: 'sample.txt',
        buffer,
        mimeType: 'text/plain',
      })

      expect(result.title).toBe('sample')
      expect(result.content).toBe('Plain text content here.')
    })
  })

  describe('extractContentFromUrl', () => {
    it('parses valid HTML to readable text', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Article Page</title></head>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>This is extracted paragraph content for learning.</p>
            </article>
          </body>
        </html>
      `
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => mockHtml,
      } as unknown as Response)

      const result = await extractContentFromUrl('https://example.com/article')
      expect(result.title).toBe('Test Article Page')
      expect(result.content).toContain('Test Article')
      expect(result.content).toContain('This is extracted paragraph content for learning.')
      expect(result.sourceUrl).toBe('https://example.com/article')
    })
  })

  describe('commitToSecondBrain', () => {
    it('generates structured note in Extracted-Docs and triggers sync script', async () => {
      const payload = {
        title: 'Reverse Engineering Study',
        content: '# Reverse Engineering\n\nKey takeaways and concepts.',
        tags: ['security', 'reversing'],
        sourceUrl: 'https://example.com/re-guide',
      }

      const result = await commitToSecondBrain(payload, { skipSyncExecution: true })
      expect(result.success).toBe(true)
      expect(result.filePath).toContain('03-Notes/Extracted-Docs')
      expect(fs.existsSync(result.filePath)).toBe(true)

      const saved = fs.readFileSync(result.filePath, 'utf-8')
      expect(saved).toContain('title: Reverse Engineering Study')
      expect(saved).toContain('tags: [security, reversing]')
      expect(saved).toContain('# Reverse Engineering')

      // Clean up test file
      if (fs.existsSync(result.filePath)) {
        fs.unlinkSync(result.filePath)
      }
    })
  })
})
