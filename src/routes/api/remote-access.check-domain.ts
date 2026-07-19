import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { checkDomainDns } from '../../server/remote-access-config'
import { getClientIp, rateLimit, rateLimitResponse } from '../../server/rate-limit'

export const Route = createFileRoute('/api/remote-access/check-domain')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ip = getClientIp(request)
        if (!rateLimit(`remote-access-check-domain:${ip}`, 15, 60_000)) {
          return rateLimitResponse()
        }

        const url = new URL(request.url)
        const domain = url.searchParams.get('domain')?.trim() ?? ''
        const expectedIp = url.searchParams.get('expectedIp')?.trim() || undefined
        if (!domain) {
          return json({ error: 'domain query param is required' }, { status: 400 })
        }

        const result = await checkDomainDns(domain, expectedIp)
        if (!result.ok) {
          return json({ error: result.error }, { status: 200 })
        }
        return json(result)
      },
    },
  },
})
