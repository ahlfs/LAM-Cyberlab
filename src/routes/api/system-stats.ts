/**
 * Host system statistics endpoint — CPU, memory, disks, network rates,
 * uptime, and temperature for the dashboard System Monitor widget.
 * Cheap enough to poll every few seconds; rate baselines live in
 * src/server/system-stats.ts.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { collectSystemStats } from '../../server/system-stats'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json(await collectSystemStats())
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'stats collection failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
