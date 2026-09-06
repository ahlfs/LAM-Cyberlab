import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  getAttachmentFileStreamOrBuffer,
  saveAttachment,
} from '../../server/attachment-store'
import { isAuthenticated, requireLocalOrAuth } from '../../server/auth-middleware'

export const Route = createFileRoute('/api/attachments')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const url = new URL(request.url)
          const id = url.searchParams.get('id')?.trim()
          if (!id) {
            return new Response('Attachment ID is required', { status: 400 })
          }

          const fileData = getAttachmentFileStreamOrBuffer(id)
          if (!fileData) {
            return new Response('Attachment not found', { status: 404 })
          }

          return new Response(new Uint8Array(fileData.buffer), {
            status: 200,
            headers: {
              'Content-Type': fileData.meta.contentType || 'application/octet-stream',
              'Content-Length': String(fileData.meta.size),
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (err) {
          return new Response(
            err instanceof Error ? err.message : 'Failed to serve attachment',
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const body = (await request.json()) as {
            data?: string // Base64 or DataURL
            fileName?: string
            contentType?: string
            sessionId?: string
            id?: string
          }

          if (!body.data) {
            return json({ ok: false, error: 'Attachment data is required' }, { status: 400 })
          }

          const stored = saveAttachment(body.data, {
            id: body.id,
            fileName: body.fileName,
            contentType: body.contentType,
            sessionId: body.sessionId,
          })

          return json({
            ok: true,
            attachment: stored,
          })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : 'Failed to save attachment',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
