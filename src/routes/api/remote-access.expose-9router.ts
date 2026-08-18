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

        // Auto-restart 9router via PM2.
        // Bypass ecosystem file — langsung passing host baru ke pm2 start agar tidak terkena cache PM2.
        const { execSync } = require('node:child_process')
        let pm2Bin = 'pm2'
        try {
          pm2Bin = execSync('which pm2', { encoding: 'utf8' }).trim()
        } catch {
          const fs = require('node:fs')
          for (const p of ['/usr/local/bin/pm2', '/usr/bin/pm2']) {
            if (fs.existsSync(p)) { pm2Bin = p; break }
          }
        }
        const newHost = parsed.data.enabled ? '0.0.0.0' : '127.0.0.1'
        const cmd = [
          `${pm2Bin} delete 9router 2>/dev/null;`,
          `${pm2Bin} start /usr/local/bin/9router`,
          `--name 9router`,
          `--interpreter none`,
          `--max-restarts 10`,
          `--restart-delay 3000`,
          `-- --host ${newHost} --port 3035 --tray`,
          `&& ${pm2Bin} save`,
        ].join(' ')
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
              console.log(`[9router-restart] OK (host=${newHost}):`, stdout.trim())
            }
          }
        )

        return json(result)
      },
    },
  },
})
