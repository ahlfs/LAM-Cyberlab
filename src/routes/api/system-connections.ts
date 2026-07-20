/**
 * Active (ESTABLISHED) TCP connections for the System page — see
 * network-connections.ts.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getNetworkConnections } from '../../server/network-connections'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-connections')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json({ connections: await getNetworkConnections() })
        } catch (err) {
          return json(
            {
              error:
                err instanceof Error ? err.message : 'connection scan failed',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
