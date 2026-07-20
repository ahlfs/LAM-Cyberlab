/**
 * GPU stats (NVIDIA + AMD) for the System page — see gpu-stats.ts.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getGpuStats } from '../../server/gpu-stats'
import { isAuthenticated } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/system-gpu')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          return Response.json({ gpus: await getGpuStats() })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'gpu scan failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
