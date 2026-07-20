/**
 * Recent warning+ system log entries for the System page — see system-logs.ts.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getSystemLogs } from '../../server/system-logs'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-logs')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json({ logs: await getSystemLogs(100) })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'log read failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
