/**
 * Linku collection endpoint — list links (with view/folder/search
 * filters) and create new links.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import {
  LinkuNotFoundError,
  createLink,
  listLinks,
  type LinkuView,
} from '../../server/linku-db'

const VALID_VIEWS = new Set<LinkuView>(['all', 'recent', 'favorites', 'archive', 'trash'])

export const Route = createFileRoute('/api/links')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const url = new URL(request.url)
        const viewParam = url.searchParams.get('view') ?? 'all'
        const view = VALID_VIEWS.has(viewParam as LinkuView)
          ? (viewParam as LinkuView)
          : 'all'
        const folderIdParam = url.searchParams.get('folderId')
        const search = url.searchParams.get('search') ?? undefined
        try {
          const links = listLinks({
            view,
            folderId: folderIdParam ? Number(folderIdParam) : undefined,
            search,
          })
          return json({ links })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'failed to list links' },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        let body: {
          folderId?: number | null
          url?: string
          title?: string
          faviconUrl?: string | null
          description?: string | null
        }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (!body.url?.trim() || !body.title?.trim()) {
          return json({ error: 'url and title are required' }, { status: 400 })
        }
        try {
          const link = createLink({
            folderId: body.folderId ?? null,
            url: body.url.trim(),
            title: body.title.trim(),
            faviconUrl: body.faviconUrl ?? null,
            description: body.description ?? null,
          })
          return json({ link }, { status: 201 })
        } catch (err) {
          if (err instanceof LinkuNotFoundError) {
            return json({ error: err.message }, { status: 404 })
          }
          return json(
            { error: err instanceof Error ? err.message : 'failed to create link' },
            { status: 500 },
          )
        }
      },
    },
  },
})
