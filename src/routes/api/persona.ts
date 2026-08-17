import { createFileRoute } from '@tanstack/react-router'
import { requireLocalOrAuth } from '../../server/auth-middleware'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import util from 'node:util'
import { personas } from '../../lib/personas'

const execPromise = util.promisify(exec)

const getHermesHome = () =>
  process.env.HERMES_HOME ??
  process.env.CLAUDE_HOME ??
  path.join(os.homedir(), '.hermes')

const getSoulPath = () => path.join(getHermesHome(), 'soul.md')

export const Route = createFileRoute('/api/persona')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return new Response('Unauthorized', { status: 401 })
        }
        try {
          const soulPath = getSoulPath()
          const content = await fs.readFile(soulPath, 'utf-8')
          // Try to find matching persona by name
          const nameMatch = content.match(/- \*\*Character Name:\*\* (.+)/)
          let activePersonaId = 'custom'
          if (nameMatch) {
            const characterName = nameMatch[1].trim()
            const activePersona = personas.find(
              (p) => p.name.includes(characterName) || p.id.toLowerCase() === characterName.toLowerCase()
            )
            if (activePersona) activePersonaId = activePersona.id
          }
          return Response.json({
            ok: true,
            activePersonaId,
            content,
          })
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            return Response.json({
              ok: true,
              activePersonaId: 'default',
              content: '',
            })
          }
          return Response.json(
            { ok: false, error: String(error) },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return new Response('Unauthorized', { status: 401 })
        }
        try {
          const body = await request.json()
          const personaId = body.personaId
          if (!personaId) {
            return Response.json(
              { ok: false, error: 'Missing personaId' },
              { status: 400 },
            )
          }

          if (personaId !== 'default') {
            const persona = personas.find((p) => p.id === personaId)
            if (!persona) {
              return Response.json(
                { ok: false, error: 'Persona not found' },
                { status: 404 },
            )
            }
          }

          const hermesHome = getHermesHome()
          await fs.mkdir(hermesHome, { recursive: true })

          if (personaId === 'default') {
            // Or handle reverting to default in swap-persona if supported
            // Assuming for now deleting works or we ignore
            try {
              await fs.unlink(getSoulPath())
            } catch (e: any) {
              if (e.code !== 'ENOENT') throw e
            }
          } else {
            // Call the python script
            const scriptPath = path.join(hermesHome, 'hermes-agent', 'scripts', 'swap-persona.py')
            await execPromise(`python3 "${scriptPath}" --preset "${personaId}"`)
          }

          return Response.json({ ok: true, personaId })
        } catch (error: any) {
          return Response.json(
            { ok: false, error: String(error) },
            { status: 500 },
          )
        }
      },
    },
  },
})
