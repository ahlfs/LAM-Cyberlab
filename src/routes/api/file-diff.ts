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

// In-memory shadow baseline cache for non-git files to track AI changes
const baselineSnapshots = new Map<string, { content: string; mtime: number }>()

async function getGitOriginalContent(filePath: string): Promise<{ isGit: boolean; content: string | null }> {
  try {
    const fileDir = path.dirname(filePath)
    // 1. Find git root
    const { stdout: gitRootRaw } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: fileDir,
    })
    const gitRoot = gitRootRaw.trim()
    if (!gitRoot) return { isGit: false, content: null }

    // 2. Get relative path to git root
    const relativePath = path.relative(gitRoot, filePath)

    // 3. Extract content from HEAD
    const { stdout: originalContent } = await execFileAsync('git', ['show', `HEAD:${relativePath}`], {
      cwd: gitRoot,
    })
    return { isGit: true, content: originalContent }
  } catch (error: any) {
    // If file is untracked in git, HEAD:<path> fails with fatal/error
    // But repository might still be git
    if (error?.message && !error.message.includes('not a git repository')) {
      return { isGit: true, content: '' }
    }
    return { isGit: false, content: null }
  }
}

async function getGitChangedFiles(dirPath: string): Promise<Array<{ path: string; status: string; staged: boolean }>> {
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
      // If checkDir is not a git repo (e.g. root workspace folder containing multiple repos),
      // scan subdirectories for git repositories
      try {
        const entries = await fs.readdir(checkDir, { withFileTypes: true })
        const results: Array<{ path: string; status: string; staged: boolean }> = []
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'vendor') {
            const subDir = path.join(checkDir, entry.name)
            try {
              // Direct check if subDir has .git folder
              const gitDirStat = await fs.stat(path.join(subDir, '.git')).catch(() => null)
              if (gitDirStat) {
                const subFiles = await getGitChangedFiles(subDir)
                results.push(...subFiles)
              }
            } catch {
              // ignore
            }
          }
        }

        // Also check baselineSnapshots for modified non-git files under checkDir
        for (const [filePath, snap] of baselineSnapshots.entries()) {
          if (filePath.startsWith(checkDir)) {
            try {
              const cur = await fs.readFile(filePath, 'utf-8')
              if (cur !== snap.content && !results.some((r) => r.path === filePath)) {
                results.push({
                  path: filePath,
                  status: 'M',
                  staged: false,
                })
              }
            } catch {
              // file deleted
            }
          }
        }

        return results
      } catch {
        return []
      }
    }

    if (!gitRoot) return []

    const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd: gitRoot,
    })

    const lines = statusOutput.split('\n').filter(Boolean)
    const results: Array<{ path: string; status: string; staged: boolean }> = []

    for (const line of lines) {
      if (line.length < 4) continue
      const statusCode = line.slice(0, 2).trim()
      let relPath = line.slice(3).trim()
      // If renamed (R  old -> new), extract new
      if (relPath.includes(' -> ')) {
        relPath = relPath.split(' -> ')[1].trim()
      }
      const fullPath = path.resolve(gitRoot, relPath)
      results.push({
        path: fullPath,
        status: statusCode || 'M',
        staged: line[0] !== ' ' && line[0] !== '?',
      })
    }
    return results
  } catch {
    return []
  }
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
            const files = await getGitChangedFiles(targetDir)
            return json({ ok: true, files })
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

          // Try git original
          const gitResult = await getGitOriginalContent(resolvedPath)
          if (gitResult.isGit && gitResult.content !== null) {
            return json({
              ok: true,
              isGit: true,
              source: 'git-head',
              originalContent: gitResult.content,
              currentContent,
            })
          }

          // Fallback: non-git baseline snapshot mechanism
          const existingSnapshot = baselineSnapshots.get(resolvedPath)
          if (!existingSnapshot) {
            // First time this file is observed: store as baseline
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

          // If file changed on disk compared to baseline, return baseline as originalContent!
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
            action?: 'accept' | 'decline'
            path?: string
            originalContent?: string
            modifiedContent?: string
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

          if (body.action === 'decline' && typeof body.originalContent === 'string') {
            // Revert file to original content
            await fs.writeFile(resolvedPath, body.originalContent, 'utf-8')
            return json({ ok: true, action: 'reverted' })
          }

          if (body.action === 'accept' && typeof body.modifiedContent === 'string') {
            // Confirm saving current modified content
            await fs.writeFile(resolvedPath, body.modifiedContent, 'utf-8')

            // Update baseline snapshot for non-git files
            baselineSnapshots.set(resolvedPath, {
              content: body.modifiedContent,
              mtime: Date.now(),
            })

            // If it's a git repo, stage/commit changes to HEAD so diff disappears
            try {
              const fileDir = path.dirname(resolvedPath)
              const { stdout: gitRootRaw } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
                cwd: fileDir,
              })
              const gitRoot = gitRootRaw.trim()
              if (gitRoot) {
                await execFileAsync('git', ['add', resolvedPath], { cwd: gitRoot })
                await execFileAsync('git', ['-c', 'user.name=LAM Cyberlab', '-c', 'user.email=editor@cyberlab.internal', 'commit', '-m', `Accept changes for ${path.basename(resolvedPath)}`], { cwd: gitRoot })
              }
            } catch {
              // fallback
            }

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
