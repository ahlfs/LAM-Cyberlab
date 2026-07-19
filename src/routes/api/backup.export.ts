import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { createBackupZip } from '../../server/backup'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '../../server/rate-limit'

const BodySchema = z.object({
  settings: z.record(z.string(), z.string()).default({}),
})

export const Route = createFileRoute('/api/backup/export')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`backup-export:${ip}`, 5, 60_000)) {
          return rateLimitResponse()
        }

        const raw = await request.json().catch(() => ({}))
        const parsed = BodySchema.safeParse(raw)
        if (!parsed.success) {
          return json({ error: 'Invalid request' }, { status: 400 })
        }

        try {
          const zipBuffer = await createBackupZip(parsed.data.settings)
          const filename = `lam-cyberlab-backup-${new Date().toISOString().slice(0, 10)}.zip`
          return new Response(Uint8Array.from(zipBuffer), {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'Backup failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
