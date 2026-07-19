import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { emptyTrash } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/trash-empty')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        return json({ deleted: emptyTrash() })
      },
    },
  },
})
