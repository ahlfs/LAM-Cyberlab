import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { restoreBackupZip } from '../../server/backup'
import { getClientIp, rateLimit, rateLimitResponse } from '../../server/rate-limit'

const MAX_BACKUP_BYTES = 200 * 1024 * 1024 // 200MB — generous, but not unbounded

export const Route = createFileRoute('/api/backup/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ip = getClientIp(request)
        if (!rateLimit(`backup-import:${ip}`, 5, 60_000)) {
          return rateLimitResponse()
        }

        const contentType = request.headers.get('content-type') || ''
        if (!contentType.includes('multipart/form-data')) {
          return json(
            { error: 'Expected multipart/form-data with a "file" field' },
            { status: 415 },
          )
        }

        try {
          const form = await request.formData()
          const file = form.get('file')
          if (!(file instanceof File)) {
            return json({ error: 'Missing file' }, { status: 400 })
          }
          if (file.size > MAX_BACKUP_BYTES) {
            return json({ error: 'Backup file is too large' }, { status: 413 })
          }

          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await restoreBackupZip(buffer)
          if (!result.ok) {
            return json({ error: result.error }, { status: 400 })
          }
          return json({ ok: true, settings: result.settings, manifest: result.manifest })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'Restore failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
