import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  safeErrorMessage,
} from '../../../server/rate-limit'
import { commitToSecondBrain } from '../../../server/study-service'

export const Route = createFileRoute('/api/study/commit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const ip = getClientIp(request)
        if (!rateLimit(`study-commit:${ip}`, 20, 60_000)) {
          return rateLimitResponse()
        }

        try {
          const body = (await request.json().catch(() => ({}))) as {
            title?: string
            content?: string
            tags?: string[]
            sourceUrl?: string
          }

          if (!body.title || typeof body.title !== 'string') {
            return json({ ok: false, error: 'Title is required.' }, { status: 400 })
          }

          if (!body.content || typeof body.content !== 'string') {
            return json({ ok: false, error: 'Content is required.' }, { status: 400 })
          }

          const result = await commitToSecondBrain({
            title: body.title,
            content: body.content,
            tags: Array.isArray(body.tags) ? body.tags : ['study'],
            sourceUrl: body.sourceUrl,
          })

          return json({ ok: true, data: result })
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
