import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { createFolder, listFolders } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/folders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        return json({ folders: listFolders() })
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        let body: { name?: string; color?: string }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (!body.name?.trim() || !body.color?.trim()) {
          return json({ error: 'name and color are required' }, { status: 400 })
        }
        try {
          const folder = createFolder(body.name.trim(), body.color.trim())
          return json({ folder }, { status: 201 })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'failed to create folder' },
            { status: 500 },
          )
        }
      },
    },
  },
})
