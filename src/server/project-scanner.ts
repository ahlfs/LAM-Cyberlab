/**
 * Project Scanner — detect and manage dev-server processes for projects
 * found under configurable base paths (default: /workspace).
 *
 * Reuses port-scanning patterns from swarm-project.ts and process-management
 * patterns from terminal-sessions.ts.
 */
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { readdir, stat, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import EventEmitter from 'node:events'

const execFileAsync = promisify(execFile)

/* ── Types ───────────────────────────────────────────────────────────── */

export type FrameworkKind =
  | 'vite'
  | 'nextjs'
  | 'laravel'
  | 'django'
  | 'flutter'
  | 'react'
  | 'node'
  | 'rust'
  | 'go'
  | 'codeigniter'
  | 'nuxtjs'
  | 'svelte'
  | 'vue'
  | 'angular'
  | 'rails'
  | 'spring'
  | 'nestjs'
  | 'flask'
  | 'html'
  | 'python'
  | 'vanillajs'
  | 'unknown'

export type ProjectInfo = {
  /** Absolute path to the project root */
  path: string
  /** Human-readable project name */
  name: string
  /** Detected framework */
  framework: FrameworkKind
  /** Framework label for display */
  frameworkLabel: string
  /** Default run command for this framework */
  defaultCommand: string
  /** Git branch (if a git repo) */
  branch: string | null
  /** Number of uncommitted changes */
  changedFilesCount: number
  /** Whether a dev server is currently running (managed by us) */
  running: boolean
  /** Whether the dev server exited unexpectedly */
  crashed: boolean
  /** Port the dev server is listening on (if running) */
  port: number | null
  /** URL to access the dev server */
  url: string | null
  /** When the server was started */
  startedAt: number | null
  /** Last N lines of log output */
  recentLogs: string[]
  /** Whether the server is exposed to 0.0.0.0 (public) */
  isPublic?: boolean
}

export type RunningServer = {
  process: ChildProcess | null
  port: number | null
  command: string
  crashed: boolean
  startedAt: number
  logBuffer: string[]
  emitter: EventEmitter
  isPublic?: boolean
}

/* ── Constants ───────────────────────────────────────────────────────── */

const LOG_BUFFER_MAX = 200

const FRAMEWORK_DEFS: Array<{
  kind: FrameworkKind
  label: string
  detect: (dir: string) => boolean
  defaultCmd: string
}> = [
  {
    kind: 'flutter',
    label: 'Flutter',
    detect: (d) => existsSync(join(d, 'pubspec.yaml')),
    defaultCmd: 'flutter run -d web-server --web-port=8080',
  },
  {
    kind: 'django',
    label: 'Django',
    detect: (d) => existsSync(join(d, 'manage.py')),
    defaultCmd: 'python manage.py runserver',
  },
  {
    kind: 'laravel',
    label: 'Laravel',
    detect: (d) => existsSync(join(d, 'artisan')) && existsSync(join(d, 'composer.json')),
    defaultCmd: 'php artisan serve --port=8000',
  },
  {
    kind: 'nextjs',
    label: 'Next.js',
    detect: (d) => {
      if (!existsSync(join(d, 'package.json'))) return false
      return (
        existsSync(join(d, 'next.config.js')) ||
        existsSync(join(d, 'next.config.mjs')) ||
        existsSync(join(d, 'next.config.ts'))
      )
    },
    defaultCmd: 'npm run dev',
  },
  {
    kind: 'vite',
    label: 'Vite (React/Vue)',
    detect: (d) => {
      if (!existsSync(join(d, 'package.json'))) return false
      return (
        existsSync(join(d, 'vite.config.ts')) ||
        existsSync(join(d, 'vite.config.js')) ||
        existsSync(join(d, 'vite.config.mjs'))
      )
    },
    defaultCmd: 'npm run dev',
  },
  {
    kind: 'rust',
    label: 'Rust',
    detect: (d) => existsSync(join(d, 'Cargo.toml')),
    defaultCmd: 'cargo run',
  },
  {
    kind: 'go',
    label: 'Go',
    detect: (d) => existsSync(join(d, 'go.mod')),
    defaultCmd: 'go run .',
  },
  {
    kind: 'codeigniter',
    label: 'CodeIgniter 4',
    detect: (d) => existsSync(join(d, 'spark')) && existsSync(join(d, 'app', 'Config')),
    defaultCmd: 'php spark serve',
  },
  {
    kind: 'nuxtjs',
    label: 'Nuxt.js',
    detect: (d) => existsSync(join(d, 'nuxt.config.js')) || existsSync(join(d, 'nuxt.config.ts')),
    defaultCmd: 'npm run dev',
  },
  {
    kind: 'svelte',
    label: 'SvelteKit',
    detect: (d) => existsSync(join(d, 'svelte.config.js')) || existsSync(join(d, 'svelte.config.ts')),
    defaultCmd: 'npm run dev',
  },
  {
    kind: 'vue',
    label: 'Vue.js',
    detect: (d) => existsSync(join(d, 'vue.config.js')) || existsSync(join(d, 'vue.config.ts')),
    defaultCmd: 'npm run serve',
  },
  {
    kind: 'angular',
    label: 'Angular',
    detect: (d) => existsSync(join(d, 'angular.json')),
    defaultCmd: 'npm start',
  },
  {
    kind: 'rails',
    label: 'Ruby on Rails',
    detect: (d) => existsSync(join(d, 'Gemfile')) && existsSync(join(d, 'app', 'controllers')),
    defaultCmd: 'rails server',
  },
  {
    kind: 'spring',
    label: 'Spring Boot',
    detect: (d) => existsSync(join(d, 'pom.xml')) && existsSync(join(d, 'src', 'main', 'java')),
    defaultCmd: 'mvn spring-boot:run',
  },
  {
    kind: 'nestjs',
    label: 'NestJS',
    detect: (d) => existsSync(join(d, 'nest-cli.json')),
    defaultCmd: 'npm run start:dev',
  },
  {
    kind: 'flask',
    label: 'Flask',
    detect: (d) => existsSync(join(d, 'requirements.txt')) && (existsSync(join(d, 'app.py')) || existsSync(join(d, 'main.py'))),
    defaultCmd: 'flask run',
  },
  {
    kind: 'html',
    label: 'Native HTML/CSS',
    detect: (d) => existsSync(join(d, 'index.html')) && !existsSync(join(d, 'package.json')),
    defaultCmd: 'python3 -m http.server 8080',
  },
  {
    kind: 'python',
    label: 'Python Script',
    detect: (d) => (existsSync(join(d, 'main.py')) || existsSync(join(d, 'script.py'))) && !existsSync(join(d, 'requirements.txt')) && !existsSync(join(d, 'manage.py')),
    defaultCmd: 'python3 main.py',
  },
  {
    kind: 'vanillajs',
    label: 'Vanilla JS',
    detect: (d) => (existsSync(join(d, 'index.js')) || existsSync(join(d, 'main.js'))) && !existsSync(join(d, 'package.json')),
    defaultCmd: 'node index.js',
  },
  {
    kind: 'react',
    label: 'React (CRA)',
    detect: (d) => {
      try {
        const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf-8'))
        return !!(pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts'])
      } catch {
        return false
      }
    },
    defaultCmd: 'BROWSER=none PORT=3030 npm start',
  },
  {
    kind: 'node',
    label: 'Node.js',
    detect: (d) => existsSync(join(d, 'package.json')),
    defaultCmd: 'npm start',
  },
]

/* ── In-memory running server registry ───────────────────────────────── */

const runningServers = new Map<string, RunningServer>()

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getBasePaths(): string[] {
  const envPaths = process.env.PROJECT_SCAN_PATHS
  if (envPaths) {
    return envPaths
      .split(',')
      .map((p) => p.trim().replace(/^~/, homedir()))
      .filter((p) => existsSync(p))
  }
  // Default: ~/workspace
  const defaultPath = join(homedir(), 'workspace')
  return existsSync(defaultPath) ? [defaultPath] : []
}

function detectFramework(
  dir: string,
): { kind: FrameworkKind; label: string; defaultCmd: string } {
  for (const def of FRAMEWORK_DEFS) {
    if (def.detect(dir)) {
      return { kind: def.kind, label: def.label, defaultCmd: def.defaultCmd }
    }
  }
  return { kind: 'unknown', label: 'Unknown', defaultCmd: '' }
}

async function gitBranch(cwd: string): Promise<string | null> {
  if (!existsSync(join(cwd, '.git'))) return null
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 1500,
    })
    const branch = stdout.trim()
    return branch && branch !== 'HEAD' ? branch : null
  } catch {
    return null
  }
}

async function gitChangedCount(cwd: string): Promise<number> {
  if (!existsSync(join(cwd, '.git'))) return 0
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, 'status', '--porcelain'], {
      encoding: 'utf-8',
      timeout: 2000,
    })
    return stdout.split('\n').filter((l) => l.trim()).length
  } catch {
    return 0
  }
}

async function projectName(dir: string): Promise<string> {
  // Try package.json name first
  try {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
      if (typeof pkg.name === 'string' && pkg.name.trim()) return pkg.name.trim()
    }
  } catch {}
  // Try pubspec.yaml name
  try {
    const pubPath = join(dir, 'pubspec.yaml')
    if (existsSync(pubPath)) {
      const content = await readFile(pubPath, 'utf-8')
      const match = content.match(/^name:\s*(.+)$/m)
      if (match && match[1]) return match[1].trim()
    }
  } catch {}
  // Try composer.json name
  try {
    const composerPath = join(dir, 'composer.json')
    if (existsSync(composerPath)) {
      const pkg = JSON.parse(await readFile(composerPath, 'utf-8'))
      if (typeof pkg.name === 'string' && pkg.name.trim()) return pkg.name.trim()
    }
  } catch {}
  return basename(dir)
}

function extractPortFromCommand(cmd: string): { port: number; start: number; end: number } | null {
  // Match --port=XXXX, --port XXXX, --web-port=XXXX, -p XXXX, PORT=XXXX, :XXXX (django style)
  const patterns = [
    /--(?:web-)?port[=\s](\d{2,5})/,
    /-p\s+(\d{2,5})/,
    /PORT=(\d{2,5})/,
    /0\.0\.0\.0:(\d{2,5})/,
    /localhost:(\d{2,5})/,
    /127\.0\.0\.1:(\d{2,5})/,
  ]
  for (const pattern of patterns) {
    const m = cmd.match(pattern)
    if (m && m[1] && m.index !== undefined) {
      const n = parseInt(m[1], 10)
      if (n > 0 && n < 65536) {
        // Find exact start index of the port number in the original string
        const start = m.index + m[0].lastIndexOf(m[1])
        const end = start + m[1].length
        return { port: n, start, end }
      }
    }
  }
  return null
}

async function getAvailablePort(startPort: number): Promise<number> {
  let port = startPort
  while (port < 65535) {
    const isFree = await new Promise<boolean>((resolve) => {
      const server = createServer()
      server.unref()
      server.on('error', () => resolve(false))
      server.listen(port, () => {
        server.close(() => resolve(true))
      })
    })
    if (isFree) return port
    port++
  }
  return startPort
}

/* ── Public API ──────────────────────────────────────────────────────── */

export async function scanProjects(): Promise<ProjectInfo[]> {
  const basePaths = getBasePaths()
  const projects: ProjectInfo[] = []
  
  // Recursively find projects up to maxDepth
  async function scanDir(dir: string, depth: number, maxDepth: number) {
    if (depth > maxDepth) return
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      
      const fullPath = join(dir, entry)
      try {
        const s = await stat(fullPath)
        if (!s.isDirectory()) continue
      } catch {
        continue
      }

      const fw = detectFramework(fullPath)
      if (fw.kind !== 'unknown') {
        const server = runningServers.get(fullPath)
        projects.push({
          path: fullPath,
          name: await projectName(fullPath),
          framework: fw.kind,
          frameworkLabel: fw.label,
          defaultCommand: fw.defaultCmd,
          branch: await gitBranch(fullPath),
          changedFilesCount: await gitChangedCount(fullPath),
          running: !!server?.process,
          crashed: !!server?.crashed,
          port: server?.port ?? null,
          url: server?.port ? `http://${server.isPublic ? '0.0.0.0' : 'localhost'}:${server.port}` : null,
          startedAt: server?.startedAt ?? null,
          recentLogs: server?.logBuffer.slice(-50) ?? [],
          isPublic: !!server?.isPublic,
        })
      } else {
        // If not a project, recurse deeper
        await scanDir(fullPath, depth + 1, maxDepth)
      }
    }
  }

  for (const base of basePaths) {
    await scanDir(base, 1, 3)
  }

  // Sort: running first, then alphabetical
  projects.sort((a, b) => {
    if (a.running && !b.running) return -1
    if (!a.running && b.running) return 1
    return a.name.localeCompare(b.name)
  })

  return projects
}

export async function startProject(
  projectPath: string,
  customCommand?: string,
  isPublic?: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (runningServers.has(projectPath)) {
    const existing = runningServers.get(projectPath)!
    if (existing.process) {
      return { ok: false, error: 'Server is already running for this project' }
    }
  }

  if (!existsSync(projectPath)) {
    return { ok: false, error: 'Project path does not exist' }
  }

  const fw = detectFramework(projectPath)
  let command = customCommand || fw.defaultCmd
  if (!command) {
    return { ok: false, error: 'No run command available for this project type' }
  }

  if (isPublic) {
    if (fw.kind === 'vite' && !command.includes('--host')) {
      command += ' -- --host 0.0.0.0'
    } else if (fw.kind === 'nextjs' && !command.includes('-H')) {
      command += ' -- -H 0.0.0.0'
    } else if (fw.kind === 'laravel' && !command.includes('--host')) {
      command += ' --host=0.0.0.0'
    } else if (fw.kind === 'django' && !command.includes('0.0.0.0')) {
      command = command.replace('runserver', 'runserver 0.0.0.0:8000')
    } else if (fw.kind === 'flutter' && !command.includes('--web-hostname')) {
      command += ' --web-hostname=0.0.0.0'
    } else if (fw.kind === 'codeigniter' && !command.includes('--host')) {
      command += ' --host=0.0.0.0'
    } else if (fw.kind === 'nuxtjs' && !command.includes('-H')) {
      command += ' -- -H 0.0.0.0'
    } else if (fw.kind === 'svelte' && !command.includes('--host')) {
      command += ' -- --host 0.0.0.0'
    } else if (fw.kind === 'vue' && !command.includes('--host')) {
      command += ' -- --host 0.0.0.0'
    } else if (fw.kind === 'angular' && !command.includes('--host')) {
      command += ' -- --host 0.0.0.0'
    } else if (fw.kind === 'rails' && !command.includes('-b')) {
      command += ' -b 0.0.0.0'
    } else if (fw.kind === 'flask' && !command.includes('--host')) {
      command += ' --host=0.0.0.0'
    } else if (fw.kind === 'html' && !command.includes('--bind')) {
      command = command.replace('8080', '8080 --bind 0.0.0.0')
    }
  }

  const match = extractPortFromCommand(command)
  let port = match?.port ?? null

  if (match && match.port) {
    const newPort = await getAvailablePort(match.port)
    if (newPort !== match.port) {
      command = command.substring(0, match.start) + newPort.toString() + command.substring(match.end)
      port = newPort
    }
  }

  const emitter = new EventEmitter()
  const logBuffer: string[] = []

  // Split command for spawn — use shell mode so npm/npx/php etc. resolve
  const proc = spawn(command, [], {
    cwd: projectPath,
    shell: true,
    detached: true,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const pushLog = (line: string) => {
    logBuffer.push(line)
    if (logBuffer.length > LOG_BUFFER_MAX) {
      logBuffer.shift()
    }
    emitter.emit('log', line)
    
    // Dynamic port detection from stdout (e.g. Vite, Next.js, Laravel)
    const serverEntry = runningServers.get(projectPath)
    if (serverEntry && !serverEntry.port) {
      const m = line.match(/(?:http:\/\/localhost:|started server on.*:|Ready in.*port\s)(\d{2,5})/i)
      if (m && m[1]) {
        serverEntry.port = parseInt(m[1], 10)
      }
    }
  }

  proc.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter((l) => l.trim())
    for (const line of lines) pushLog(line)
  })

  proc.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter((l) => l.trim())
    for (const line of lines) pushLog(line)
  })

  proc.on('exit', (code) => {
    pushLog(`[Process exited with code ${code}]`)
    const s = runningServers.get(projectPath)
    if (s) {
      s.process = null
      if (code !== 0 && code !== null) {
        s.crashed = true
      } else {
        runningServers.delete(projectPath)
      }
    }
    emitter.emit('exit', code)
  })

  proc.on('error', (err) => {
    pushLog(`[Process error: ${err.message}]`)
    const s = runningServers.get(projectPath)
    if (s) {
      s.process = null
      s.crashed = true
    }
  })

  runningServers.set(projectPath, {
    process: proc,
    port,
    command,
    crashed: false,
    startedAt: Date.now(),
    logBuffer: [],
    emitter,
    isPublic: !!isPublic,
  })

  // Delayed return to avoid false positives on instant crash
  return new Promise((resolve) => {
    setTimeout(() => {
      const s = runningServers.get(projectPath)
      if (!s || s.crashed || !s.process) {
        resolve({ ok: false, error: 'Server crashed immediately on start' })
      } else {
        resolve({ ok: true })
      }
    }, 500)
  })
}

export function stopProject(projectPath: string): { ok: boolean; error?: string } {
  const server = runningServers.get(projectPath)
  if (!server) {
    return { ok: false, error: 'No running server found for this project' }
  }

  if (!server.process) {
    runningServers.delete(projectPath)
    return { ok: true }
  }

  try {
    // Kill the process group to catch child processes (dev servers often fork)
    if (server.process.pid) {
      try {
        process.kill(-server.process.pid, 'SIGTERM')
      } catch {
        server.process.kill('SIGTERM')
      }
    } else {
      server.process.kill('SIGTERM')
    }

    // Force kill after 3 seconds if still alive
    setTimeout(() => {
      try {
        if (server.process?.pid && !server.process.killed) {
          process.kill(-server.process.pid, 'SIGKILL')
        }
      } catch {
        // already dead
      }
    }, 3000)

    runningServers.delete(projectPath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to stop' }
  }
}

export function getProjectLogs(projectPath: string): string[] {
  const server = runningServers.get(projectPath)
  return server?.logBuffer ?? []
}

export function getRunningCount(): number {
  return runningServers.size
}
