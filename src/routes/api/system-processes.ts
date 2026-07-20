/**
 * Top processes by CPU% for the System page — reads /proc directly, see
 * process-monitor.ts.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getTopProcesses } from '../../server/process-monitor'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-processes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json({ processes: await getTopProcesses(8) })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'process scan failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
