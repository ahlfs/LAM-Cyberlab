/**
 * Projects API — scan, start, stop, and get logs for dev-server projects.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import {
  scanProjects,
  startProject,
  stopProject,
  getProjectLogs,
} from '../../server/project-scanner'

export const Route = createFileRoute('/api/projects')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const action = url.searchParams.get('action')

        // GET /api/projects?action=logs&path=...
        if (action === 'logs') {
          const projectPath = url.searchParams.get('path')
          if (!projectPath) {
            return json({ error: 'path required' }, { status: 400 })
          }
          return json({ logs: getProjectLogs(projectPath) })
        }

        // GET /api/projects — list all projects
        try {
          const projects = await scanProjects()
          return json({ projects })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : 'scan failed' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: Record<string, unknown>
        try {
          body = (await request.json()) as Record<string, unknown>
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const action = typeof body.action === 'string' ? body.action : ''
        const projectPath = typeof body.path === 'string' ? body.path : ''

        if (!projectPath) {
          return json({ error: 'path is required' }, { status: 400 })
        }

        switch (action) {
          case 'start': {
            const command =
              typeof body.command === 'string' && body.command.trim()
                ? body.command.trim()
                : undefined
            const isPublic = typeof body.isPublic === 'boolean' ? body.isPublic : false
            const result = await startProject(projectPath, command, isPublic)
            return json(result, { status: result.ok ? 200 : 400 })
          }

          case 'stop': {
            const result = stopProject(projectPath)
            return json(result, { status: result.ok ? 200 : 400 })
          }

          default:
            return json({ error: `Unknown action: ${action}` }, { status: 400 })
        }
      },
    },
  },
})
