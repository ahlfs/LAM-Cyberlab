import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { loadWorkspaceCatalog } from './workspace'

const execFileAsync = promisify(execFile)

function ensureWorkspacePath(input: string, workspaceRoot: string) {
  const raw = input.trim()
  if (!raw) return workspaceRoot
  const resolved = path.isAbsolute(raw)
    ? path.resolve(raw)
    : path.resolve(workspaceRoot, raw)
  return resolved
}

/**
 * 1. AI Review Buffer (Shadow Baseline Snapshots)
 * Independent from Git commits. Used for Monaco Diff highlighting
 * and granular / bulk Accept & Decline.
 */
export const baselineSnapshots = new Map<string, { content: string; mtime: number }>()

/**
 * 2. File Explorer Git SCM Provider (Same as VS Code / Cursor)
 * Reads actual `git status` when inside a Git repo.
 * When not in a Git repo, does not pollute file tree with synthetic git badges.
 */
async function getGitScmStatus(dirPath: string): Promise<{ isGit: boolean; files: Array<{ path: string; status: string; staged: boolean }> }> {
  try {
    let checkDir = dirPath
    try {
      const stat = await fs.stat(dirPath)
      if (!stat.isDirectory()) {
        checkDir = path.dirname(dirPath)
      }
    } catch {
      checkDir = process.cwd()
    }

    // Try finding git root directly from checkDir
    let gitRoot = ''
    try {
      const { stdout: gitRootRaw } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: checkDir,
      })
      gitRoot = gitRootRaw.trim()
    } catch {
      // If checkDir has sub-repos, scan direct subdirectories
      try {
        const entries = await fs.readdir(checkDir, { withFileTypes: true })
        const results: Array<{ path: string; status: string; staged: boolean }> = []
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'vendor') {
            const subDir = path.join(checkDir, entry.name)
            try {
              const subRes = await getGitScmStatus(subDir)
              if (subRes.isGit) {
                results.push(...subRes.files)
              }
            } catch {}
          }
        }
        if (results.length > 0) {
          return { isGit: true, files: results }
        }
      } catch {}
      return { isGit: false, files: [] }
    }

    if (!gitRoot) {
      return { isGit: false, files: [] }
    }

    const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain', '-uall'], {
      cwd: gitRoot,
    })

    const lines = statusOutput.split('\n').filter(Boolean)
    const results: Array<{ path: string; status: string; staged: boolean }> = []

    for (const line of lines) {
      if (line.length < 4) continue
      const rawStatus = line.slice(0, 2).trim()
      let relPath = line.slice(3).trim()
      if (relPath.includes(' -> ')) {
        relPath = relPath.split(' -> ')[1].trim()
      }
      const fullPath = path.resolve(gitRoot, relPath)

      let status = 'M'
      if (rawStatus.includes('?') || rawStatus.includes('A')) {
        status = 'U' // Untracked / Added
      } else if (rawStatus.includes('D')) {
        status = 'D' // Deleted
      } else if (rawStatus.includes('M')) {
        status = 'M' // Modified
      } else if (rawStatus.includes('R')) {
        status = 'R' // Renamed
      }

      if (fullPath.startsWith(dirPath)) {
        results.push({
          path: fullPath,
          status,
          staged: line[0] !== ' ' && line[0] !== '?',
        })
      }
    }

    return { isGit: true, files: results }
  } catch {
    return { isGit: false, files: [] }
  }
}

/**
 * Scan AI modified files from in-memory shadow baseline
 */
async function getAiModifiedFiles(dirPath: string): Promise<Array<{ path: string; status: string; staged: boolean }>> {
  const results: Array<{ path: string; status: string; staged: boolean }> = []

  for (const [filePath, snap] of baselineSnapshots.entries()) {
    if (filePath.startsWith(dirPath)) {
      try {
        const cur = await fs.readFile(filePath, 'utf-8')
        if (cur !== snap.content) {
          results.push({
            path: filePath,
            status: snap.content === '' ? 'U' : 'M',
            staged: false,
          })
        }
      } catch {
        results.push({
          path: filePath,
          status: 'D',
          staged: false,
        })
      }
    }
  }

  return results
}

export const Route = createFileRoute('/api/file-diff')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const url = new URL(request.url)
          const action = url.searchParams.get('action') || 'diff'
          const inputPath = url.searchParams.get('path')?.trim()

          let workspaceRoot = '/'
          try {
            const catalog = await loadWorkspaceCatalog()
            if (catalog.isValid && catalog.path) {
              workspaceRoot = catalog.path
            }
          } catch {
            // fallback to /
          }

          if (action === 'changed-files') {
            const targetDir = inputPath ? ensureWorkspacePath(inputPath, workspaceRoot) : workspaceRoot
            
            // 1. Get real Git SCM status (for file tree M/U/D badges like VS Code/Cursor)
            const gitStatus = await getGitScmStatus(targetDir)
            
            // 2. Get AI modified files from shadow baseline (for AI diff review & accept buttons)
            const aiFiles = await getAiModifiedFiles(targetDir)

            return json({
              ok: true,
              isGit: gitStatus.isGit,
              gitFiles: gitStatus.files,
              aiFiles,
              files: aiFiles,
            })
          }

          if (!inputPath) {
            return json({ ok: false, error: 'Path is required' }, { status: 400 })
          }

          const resolvedPath = ensureWorkspacePath(inputPath, workspaceRoot)

          // Read current disk content
          let currentContent = ''
          try {
            currentContent = await fs.readFile(resolvedPath, 'utf-8')
          } catch {
            return json({ ok: false, error: 'File not found' }, { status: 404 })
          }

          // Universal Shadow Baseline Snapshot lookup
          const existingSnapshot = baselineSnapshots.get(resolvedPath)
          if (!existingSnapshot) {
            // First time this file is observed: register as baseline
            baselineSnapshots.set(resolvedPath, {
              content: currentContent,
              mtime: Date.now(),
            })
            return json({
              ok: true,
              isGit: false,
              source: 'initial-snapshot',
              originalContent: currentContent,
              currentContent,
            })
          }

          // Return baseline snapshot as original content for Monaco diff
          return json({
            ok: true,
            isGit: false,
            source: 'baseline-snapshot',
            originalContent: existingSnapshot.content,
            currentContent,
          })
        } catch (error: any) {
          return json({ ok: false, error: error?.message || 'Failed to get file diff' }, { status: 500 })
        }
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const body = (await request.json()) as {
            action?: 'accept' | 'decline' | 'accept-all' | 'decline-all'
            path?: string
            originalContent?: string
            modifiedContent?: string
            files?: Array<{ path: string }>
          }

          const inputPath = body.path?.trim()
          if (!inputPath) {
            return json({ ok: false, error: 'Path is required' }, { status: 400 })
          }

          let workspaceRoot = '/'
          try {
            const catalog = await loadWorkspaceCatalog()
            if (catalog.isValid && catalog.path) {
              workspaceRoot = catalog.path
            }
          } catch {
            // fallback to /
          }

          const resolvedPath = ensureWorkspacePath(inputPath, workspaceRoot)

          if (body.action === 'accept-all') {
            // Bulk accept all changes: update baseline snapshots to current disk content
            const files = Array.isArray(body.files) ? body.files : []
            for (const f of files) {
              const fPath = ensureWorkspacePath(f.path || (f as any), workspaceRoot)
              try {
                const cur = await fs.readFile(fPath, 'utf-8')
                baselineSnapshots.set(fPath, {
                  content: cur,
                  mtime: Date.now(),
                })
              } catch {}
            }
            return json({ ok: true, action: 'accepted-all' })
          }

          if (body.action === 'decline-all') {
            // Bulk decline all changes: revert disk files back to baseline snapshots
            const files = Array.isArray(body.files) ? body.files : []
            for (const f of files) {
              const fPath = ensureWorkspacePath(f.path || (f as any), workspaceRoot)
              try {
                const snap = baselineSnapshots.get(fPath)
                if (snap) {
                  await fs.writeFile(fPath, snap.content, 'utf-8')
                }
              } catch {}
            }
            return json({ ok: true, action: 'declined-all' })
          }

          if (body.action === 'decline' && typeof body.originalContent === 'string') {
            // Revert file to baseline content
            await fs.writeFile(resolvedPath, body.originalContent, 'utf-8')
            return json({ ok: true, action: 'reverted' })
          }

          if (body.action === 'accept' && typeof body.modifiedContent === 'string') {
            // Confirm saving current modified content
            await fs.writeFile(resolvedPath, body.modifiedContent, 'utf-8')

            // Update universal baseline snapshot
            baselineSnapshots.set(resolvedPath, {
              content: body.modifiedContent,
              mtime: Date.now(),
            })

            return json({ ok: true, action: 'saved' })
          }

          return json({ ok: false, error: 'Invalid action or missing content' }, { status: 400 })
        } catch (error: any) {
          return json({ ok: false, error: error?.message || 'Failed to process action' }, { status: 500 })
        }
      },
    },
  },
})
