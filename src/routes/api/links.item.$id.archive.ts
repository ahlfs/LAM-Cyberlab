import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { LinkuNotFoundError, toggleArchive } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/item/$id/archive')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = Number(params.id)
        if (!Number.isInteger(id) || id <= 0) {
          return json({ error: 'Invalid id' }, { status: 400 })
        }
        try {
          return json({ link: toggleArchive(id) })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to toggle archive' },
            { status: 500 },
          )
        }
      },
    },
  },
})
