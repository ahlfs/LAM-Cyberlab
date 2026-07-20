/**
 * Active Services status for the System page — Gateway/Dashboard/9router
 * (HTTP reachability) + Caddy (process check) + the workspace itself.
 * Deliberately uncached here; see service-health.ts for why.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { checkAllServices } from '../../server/service-health'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-services')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json({ services: await checkAllServices() })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'service check failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
