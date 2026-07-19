/**
 * The "Open website" redirect — records the "Dikunjungi" (visited)
 * counter, distinct from the in-app "Dibuka" (opened) counter on
 * GET /api/links/item/$id. Meant to be used as a plain <a href>
 * so middle-click / right-click-copy-link / target=_blank all work.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { getLink, recordVisit } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/go/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = Number(params.id)
        if (!Number.isInteger(id) || id <= 0) {
          return json({ error: 'Invalid id' }, { status: 400 })
        }
        const existing = getLink(id)
        if (!existing) return json({ error: 'Link not found' }, { status: 404 })
        const link = recordVisit(id)
        return Response.redirect(link.url, 302)
      },
    },
  },
})
