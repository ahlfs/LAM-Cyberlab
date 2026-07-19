import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import {
  LinkuNotFoundError,
  deleteFolder,
  updateFolder,
} from '../../server/linku-db'

export const Route = createFileRoute('/api/links/folders/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = Number(params.id)
        if (!Number.isInteger(id) || id <= 0) {
          return json({ error: 'Invalid id' }, { status: 400 })
        }
        let body: { name?: string; color?: string }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        try {
          const folder = updateFolder(id, {
            name: body.name?.trim(),
            color: body.color?.trim(),
          })
          return json({ folder })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to update folder' },
            { status: 500 },
          )
        }
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = Number(params.id)
        if (!Number.isInteger(id) || id <= 0) {
          return json({ error: 'Invalid id' }, { status: 400 })
        }
        try {
          deleteFolder(id)
          return json({ ok: true })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to delete folder' },
            { status: 500 },
          )
        }
      },
    },
  },
})
