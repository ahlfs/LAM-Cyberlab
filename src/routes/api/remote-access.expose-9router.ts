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

        // Auto-restart 9router via PM2 menggunakan path absolut agar bekerja di semua environment
        // (termasuk saat Node.js berjalan sebagai PM2 service yang PATH-nya terbatas)
        const pm2Bin = '/usr/local/bin/pm2'
        const ecoFile = require('node:path').join(process.cwd(), 'ecosystem.config.cjs')
        const cmd = `${pm2Bin} delete 9router; ${pm2Bin} start ${ecoFile} --only 9router && ${pm2Bin} save`
        exec(
          cmd,
          {
            cwd: process.cwd(),
            shell: '/bin/bash',
            env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` },
          },
          (err, stdout, stderr) => {
            if (err) {
              console.error('[9router-restart] FAILED cmd:', cmd)
              console.error('[9router-restart] Error:', err.message)
              console.error('[9router-restart] Stderr:', stderr)
            } else {
              console.log('[9router-restart] OK:', stdout.trim())
            }
          }
        )

        return json(result)
      },
    },
  },
})
