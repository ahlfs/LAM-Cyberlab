import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { scrapeUrl } from '../../server/linku-scrape'

export const Route = createFileRoute('/api/links/scrape')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        let body: { url?: string }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (!body.url?.trim()) {
          return json({ error: 'url is required' }, { status: 400 })
        }
        try {
          const result = await scrapeUrl(body.url.trim())
          return json(result)
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'scrape failed' },
            { status: 502 },
          )
        }
      },
    },
  },
})
