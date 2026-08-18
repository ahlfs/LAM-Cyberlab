import { exec } from 'node:child_process'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { setExpose9RouterEnabled } from '../../server/remote-access-config'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '../../server/rate-limit'

const BodySchema = z.object({
  enabled: z.boolean(),
})

export const Route = createFileRoute('/api/remote-access/expose-9router')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`remote-access-expose-9router:${ip}`, 10, 60_000)) {
          return rateLimitResponse()
        }

        const raw = await request.json().catch(() => ({}))
        const parsed = BodySchema.safeParse(raw)
        if (!parsed.success) {
          return json({ error: 'Invalid request' }, { status: 400 })
        }

        const result = setExpose9RouterEnabled(parsed.data.enabled)
        if (!result.ok) {
          return json({ error: result.error }, { status: 400 })
        }

        // Secara otomatis me-reload konfigurasi PM2 dari ecosystem file agar argumen --host ikut terupdate
        exec('pm2 start ecosystem.config.cjs --only 9router && pm2 save', (err) => {
          if (err) console.error('Failed to auto-restart 9router via pm2:', err)
        })

        return json(result)
      },
    },
  },
})
