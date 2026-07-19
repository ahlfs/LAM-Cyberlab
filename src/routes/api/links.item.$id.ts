/**
 * Single-link endpoint. GET records the "Dibuka" (opened-in-app)
 * counter as a side effect of fetching detail — that's the whole
 * point of the counter. DELETE soft-trashes by default; pass
 * `?permanent=true` to hard-delete a link that is already in trash.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import {
  LinkuNotFoundError,
  getLink,
  permanentlyDeleteLink,
  recordOpen,
  softDeleteLink,
  updateLink,
} from '../../server/linku-db'

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const Route = createFileRoute('/api/links/item/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = parseId(params.id)
        if (!id) return json({ error: 'Invalid id' }, { status: 400 })
        const existing = getLink(id)
        if (!existing) return json({ error: 'Link not found' }, { status: 404 })
        const link = recordOpen(id)
        return json({ link })
      },
      PATCH: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = parseId(params.id)
        if (!id) return json({ error: 'Invalid id' }, { status: 400 })
        let body: Record<string, unknown>
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        try {
          const link = updateLink(id, {
            // null clears the folder (unsorts the link); a number moves it;
            // any other value (key absent, wrong type) leaves it untouched.
            folderId:
              body.folderId === null
                ? null
                : typeof body.folderId === 'number'
                  ? body.folderId
                  : undefined,
            url: typeof body.url === 'string' ? body.url.trim() : undefined,
            title: typeof body.title === 'string' ? body.title.trim() : undefined,
            faviconUrl:
              body.faviconUrl === null || typeof body.faviconUrl === 'string'
                ? (body.faviconUrl as string | null)
                : undefined,
            description:
              body.description === null || typeof body.description === 'string'
                ? (body.description as string | null)
                : undefined,
          })
          return json({ link })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to update link' },
            { status: 500 },
          )
        }
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = parseId(params.id)
        if (!id) return json({ error: 'Invalid id' }, { status: 400 })
        const url = new URL(request.url)
        const permanent = url.searchParams.get('permanent') === 'true'
        try {
          if (permanent) {
            permanentlyDeleteLink(id)
            return json({ ok: true })
          }
          const link = softDeleteLink(id)
          return json({ link })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to delete link' },
            { status: 500 },
          )
        }
      },
    },
  },
})
