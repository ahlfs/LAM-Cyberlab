import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { detectPublicIp } from '../../server/remote-access-config'
import { getClientIp, rateLimit, rateLimitResponse } from '../../server/rate-limit'

export const Route = createFileRoute('/api/remote-access/public-ip')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        // User-triggered only (never polled) — still rate-limit since it
        // fans out to a third-party service on every call.
        const ip = getClientIp(request)
        if (!rateLimit(`remote-access-public-ip:${ip}`, 10, 60_000)) {
          return rateLimitResponse()
        }

        const result = await detectPublicIp()
        if (!result.ok) {
          return json({ error: result.error }, { status: 502 })
        }
        return json(result)
      },
    },
  },
})
