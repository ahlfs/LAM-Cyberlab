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

        // Menggunakan pm2 secara langsung. Hindari npx karena npx bisa meminta konfirmasi interaktif (y/n) yang menyebabkan proses menggantung.
        exec(
          'pm2 restart ecosystem.config.cjs --only 9router --update-env && pm2 save',
          { cwd: process.cwd(), env: process.env },
          (err, stdout, stderr) => {
            if (err) {
              console.error('Failed to auto-restart 9router:', err)
              console.error('Stderr:', stderr)
            } else {
              console.log('Successfully restarted 9router:', stdout)
            }
          }
        )

        return json(result)
      },
    },
  },
})
