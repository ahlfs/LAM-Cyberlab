import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  safeErrorMessage,
} from '../../../server/rate-limit'
import {
  extractContentFromFile,
  extractContentFromUrl,
} from '../../../server/study-service'

const MAX_DOC_UPLOAD_BYTES = 50 * 1024 * 1024

export const Route = createFileRoute('/api/study/extract')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const ip = getClientIp(request)
        if (!rateLimit(`study-extract:${ip}`, 30, 60_000)) {
          return rateLimitResponse()
        }

        try {
          const contentType = request.headers.get('content-type') || ''

          if (contentType.includes('application/json')) {
            const body = (await request.json().catch(() => ({}))) as {
              url?: string
            }
            if (!body.url || typeof body.url !== 'string') {
              return json(
                { ok: false, error: 'Valid URL is required.' },
                { status: 400 },
              )
            }
            const result = await extractContentFromUrl(body.url)
            return json({ ok: true, data: result })
          }

          if (contentType.includes('multipart/form-data')) {
            const form = await request.formData()
            const file = form.get('file')
            if (!(file instanceof File)) {
              return json(
                { ok: false, error: 'Missing document file.' },
                { status: 400 },
              )
            }
            if (file.size <= 0) {
              return json(
                { ok: false, error: 'File is empty.' },
                { status: 400 },
              )
            }
            if (file.size > MAX_DOC_UPLOAD_BYTES) {
              return json(
                { ok: false, error: 'File exceeds 50 MB limit.' },
                { status: 413 },
              )
            }

            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const result = await extractContentFromFile({
              name: file.name,
              buffer,
              mimeType: file.type || 'application/octet-stream',
            })
            return json({ ok: true, data: result })
          }

          return json(
            {
              ok: false,
              error: 'Expected application/json or multipart/form-data.',
            },
            { status: 400 },
          )
        } catch (error) {
          return json(
            { ok: false, error: safeErrorMessage(error) },
            { status: 500 },
          )
        }
      },
    },
  },
})
