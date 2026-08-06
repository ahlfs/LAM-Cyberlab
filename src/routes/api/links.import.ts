import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { importData } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        let body
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON payload' }, { status: 400 })
        }

        if (!body.folders || !Array.isArray(body.folders) || !body.links || !Array.isArray(body.links)) {
          return json({ error: 'Invalid JSON format. Expected { folders: [], links: [] }' }, { status: 400 })
        }

        try {
          const result = importData({
            folders: body.folders,
            links: body.links
          })
          return json(result)
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'failed to import links' },
            { status: 500 },
          )
        }
      },
    },
  },
})
