import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import { getRemoteAccessStatus } from '../../server/remote-access-config'

export const Route = createFileRoute('/api/remote-access/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        return json(getRemoteAccessStatus())
      },
    },
  },
})
