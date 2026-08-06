import { createFileRoute } from '@tanstack/react-router'
import { isAuthenticated } from '../../server/auth-middleware'
import { listFolders, listLinks } from '../../server/linku-db'

export const Route = createFileRoute('/api/links/export')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        
        try {
          const folders = listFolders()
          const links = listLinks({ view: 'all' }).filter(link => !link.isTrashed)
          
          const payload = JSON.stringify({ folders, links }, null, 2)
          
          return new Response(payload, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': 'attachment; filename="linku-export.json"'
            }
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'failed to export links' }), { status: 500 })
        }
      },
    },
  },
})
