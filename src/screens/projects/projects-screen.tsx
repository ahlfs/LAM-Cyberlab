import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowReloadHorizontalIcon,
  Cancel01Icon,
  Copy01Icon,
  PlayIcon,
  StopIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  CommandLineIcon,
  Globe02Icon,
  LockIcon,
} from '@hugeicons/core-free-icons'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import type { ProjectInfo } from '@/server/project-scanner'

/**
 * Projects screen — scan /workspace for dev projects, start/stop dev servers.
 */

const POLL_MS = 5000

/* ── Framework theme colors ──────────────────────────────────────────── */

const FRAMEWORK_COLORS: Record<string, string> = {
  flutter: '#027DFD',
  django: '#092E20',
  laravel: '#FF2D20',
  react: '#61DAFB',
  nextjs: '#000000',
  vite: '#646CFF',
  node: '#339933',
  rust: '#DEA584',
  go: '#00ADD8',
  codeigniter: '#EF4223',
  nuxtjs: '#00C58E',
  svelte: '#FF3E00',
  vue: '#4FC08D',
  angular: '#DD0031',
  rails: '#CC0000',
  spring: '#6DB33F',
  nestjs: '#E0234E',
  flask: '#000000',
  html: '#E34F26',
  python: '#3776AB',
  vanillajs: '#F7DF1E',
  unknown: '#6B7280',
}

const FRAMEWORK_EMOJI: Record<string, string> = {
  flutter: '🦋',
  django: '🐍',
  laravel: '🔺',
  react: '⚛️',
  nextjs: '▲',
  vite: '⚡',
  node: '🟢',
  rust: '🦀',
  go: '🐹',
  unknown: '📦',
}

const FRAMEWORK_ICON_CLASS: Record<string, string> = {
  flutter: 'devicon-flutter-plain colored',
  django: 'devicon-django-plain colored',
  laravel: 'devicon-laravel-original colored',
  react: 'devicon-react-original colored',
  nextjs: 'devicon-nextjs-original',
  vite: 'devicon-vitejs-plain colored',
  node: 'devicon-nodejs-plain colored',
  rust: 'devicon-rust-original',
  go: 'devicon-go-original-wordmark colored',
  codeigniter: 'devicon-codeigniter-plain colored',
  nuxtjs: 'devicon-nuxtjs-plain colored',
  svelte: 'devicon-svelte-plain colored',
  vue: 'devicon-vuejs-plain colored',
  angular: 'devicon-angularjs-plain colored',
  rails: 'devicon-rails-plain colored',
  spring: 'devicon-spring-original colored',
  nestjs: 'devicon-nestjs-plain colored',
  flask: 'devicon-flask-original',
  html: 'devicon-html5-plain colored',
  python: 'devicon-python-plain colored',
  vanillajs: 'devicon-javascript-plain colored',
  unknown: 'devicon-bash-plain',
}

/* ── Panel chrome ────────────────────────────────────────────────────── */

function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--theme-accent,rgba(255,255,255,0.2))] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] ${className ?? ''}`}
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--theme-card) 98%, transparent), color-mix(in srgb, var(--theme-card2) 85%, transparent))',
        borderColor: 'var(--theme-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Subtle glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
           style={{
             background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--theme-accent) 15%, transparent), transparent 70%)'
           }} 
      />
      
      {/* Content wrapper to stay above background effects */}
      <div className="relative z-10 flex h-full flex-col gap-4">
        {children}
      </div>
    </section>
  )
}

/* ── Log viewer ──────────────────────────────────────────────────────── */

function LogViewer({ logs }: { logs: string[] }) {
  return (
    <div
      className="mt-2 max-h-48 overflow-y-auto rounded-lg border p-3 font-mono text-xs"
      style={{
        background: 'var(--theme-bg)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-muted)',
      }}
    >
      {logs.length === 0 ? (
        <p className="italic opacity-50">No logs yet...</p>
      ) : (
        logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-5">
            {line}
          </div>
        ))
      )}
    </div>
  )
}

/* ── Project card ────────────────────────────────────────────────────── */

function ProjectCard({
  project,
  onStart,
  onStop,
  isStarting,
  isStopping,
}: {
  project: ProjectInfo
  onStart: (path: string, command?: string, isPublic?: boolean) => void
  onStop: (path: string) => void
  isStarting: boolean
  isStopping: boolean
}) {
  const [showLogs, setShowLogs] = useState(false)
  const [customCmd, setCustomCmd] = useState('')
  const [showCustomCmd, setShowCustomCmd] = useState(false)

  const fwColor = FRAMEWORK_COLORS[project.framework] ?? FRAMEWORK_COLORS.unknown
  const fwIconClass = FRAMEWORK_ICON_CLASS[project.framework] ?? FRAMEWORK_ICON_CLASS.unknown

  const copyUrl = () => {
    if (project.url) {
      navigator.clipboard.writeText(project.url)
      toast('URL copied!', { type: 'success' })
    }
  }

  return (
    <Panel className="gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          {/* Icon Box */}
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-[var(--theme-bg)] shadow-sm"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <i className={`${fwIconClass} text-2xl`} />
          </div>
          
          {/* Title & Path */}
          <div className="flex min-w-0 flex-col">
            <h3
              className="truncate text-sm font-bold"
              style={{ color: 'var(--theme-text)' }}
            >
              {project.name}
            </h3>
            <p
              className="truncate font-mono text-[10px] mt-0.5"
              style={{ color: 'var(--theme-muted)' }}
            >
              {project.path}
            </p>
          </div>
        </div>
        {/* Status indicator */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
             style={{ 
               borderColor: project.running ? 'color-mix(in srgb, var(--theme-success, #22c55e) 30%, transparent)' : project.crashed ? 'color-mix(in srgb, var(--theme-danger, #ef4444) 30%, transparent)' : 'var(--theme-border)',
               background: project.running ? 'color-mix(in srgb, var(--theme-success, #22c55e) 10%, transparent)' : project.crashed ? 'color-mix(in srgb, var(--theme-danger, #ef4444) 10%, transparent)' : 'transparent',
               color: project.running ? 'var(--theme-success, #22c55e)' : project.crashed ? 'var(--theme-danger, #ef4444)' : 'var(--theme-muted)',
             }}>
          <div className="relative flex h-2 w-2 items-center justify-center">
            {project.running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--theme-success,#22c55e)] opacity-75"></span>
            )}
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{
                background: project.running
                  ? 'var(--theme-success, #22c55e)'
                  : project.crashed
                  ? 'var(--theme-danger, #ef4444)'
                  : 'var(--theme-muted)',
              }}
            />
          </div>
          {project.running ? 'Running' : project.crashed ? 'Crashed' : 'Stopped'}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: `color-mix(in srgb, ${fwColor} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${fwColor} 30%, transparent)`,
            color: fwColor,
          }}
        >
          <i className={`${fwIconClass} opacity-80 text-[11px]`} />
          {project.frameworkLabel}
        </span>
        {project.branch && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
            style={{
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-muted)',
            }}
          >
            🌿 {project.branch}
          </span>
        )}
        {project.changedFilesCount > 0 && (
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--theme-warning)' }}
          >
            {project.changedFilesCount} changed
          </span>
        )}
      </div>

      {/* Port & URL */}
      {project.running && project.url && (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              Port {project.port}
            </span>
            <code
              className="min-w-0 flex-1 truncate text-xs font-medium"
              style={{ color: 'var(--theme-accent, #60a5fa)' }}
            >
              {project.url}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 rounded p-1 transition-colors hover:bg-[var(--theme-card2)]"
              aria-label="Copy URL"
            >
              <HugeiconsIcon
                icon={Copy01Icon}
                size={13}
                style={{ color: 'var(--theme-muted)' }}
              />
            </button>
          </div>
          
          {/* Private mode SSH snippet */}
          {!project.isPublic && project.port && (
            <div className="rounded-lg border bg-[var(--theme-card2)] p-2" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                <span>SSH Port Forwarding</span>
                <button
                  type="button"
                  onClick={() => {
                    const host = window.location.hostname
                    navigator.clipboard.writeText(`ssh -L ${project.port}:localhost:${project.port} root@${host}`)
                    toast('SSH command copied!', { type: 'success' })
                  }}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--theme-text)]"
                >
                  <HugeiconsIcon icon={Copy01Icon} size={10} /> Copy
                </button>
              </div>
              <code className="block w-full overflow-x-auto whitespace-pre font-mono text-[11px]" style={{ color: 'var(--theme-accent)' }}>
                ssh -L {project.port}:localhost:{project.port} root@{window.location.hostname}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Custom command toggle */}
      {!project.running && (
        <div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCustomCmd(!showCustomCmd)}
              className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
              style={{ color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={CommandLineIcon} size={12} />
              {showCustomCmd ? 'Hide custom command' : 'Custom command'}
            </button>
            
            {project.crashed && (
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--theme-danger, #ef4444)' }}
              >
                <HugeiconsIcon icon={showLogs ? ArrowUp01Icon : ArrowDown01Icon} size={12} />
                {showLogs ? 'Hide Error Logs' : 'View Error Logs'}
              </button>
            )}
          </div>
          {showCustomCmd && (
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder={project.defaultCommand}
              className="mt-1.5 w-full rounded-lg border bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none transition-colors focus:border-[var(--theme-accent)]"
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {project.running ? (
            <>
              {project.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(project.url, '_blank')}
                  className="w-full gap-1.5 hover:border-[var(--theme-accent)] hover:bg-transparent hover:text-[var(--theme-accent)]"
                >
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
                  Open App
                </Button>
              )}
              <div className="flex w-full items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStop(project.path)}
                  disabled={isStopping}
                  className="flex-1 gap-1.5 hover:border-[var(--theme-danger)] hover:bg-transparent hover:text-[var(--theme-danger)]"
                >
                  {isStopping ? (
                    <>
                      <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} className="animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={StopIcon} size={14} />
                      Stop
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLogs(!showLogs)}
                  className={`flex-1 gap-1.5 ${showLogs ? 'bg-[var(--theme-card2)]' : ''}`}
                >
                  <HugeiconsIcon
                    icon={showLogs ? ArrowUp01Icon : ArrowDown01Icon}
                    size={14}
                  />
                  Logs
                </Button>
              </div>
            </>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStart(project.path, customCmd || undefined, true)}
                disabled={isStarting}
                className="w-full gap-1.5 hover:border-[var(--theme-success,#22c55e)] hover:bg-transparent hover:text-[var(--theme-success,#22c55e)]"
                title="Bind to 0.0.0.0 (Accessible via VPS IP)"
              >
                {isStarting ? (
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={Globe02Icon} size={14} />
                )}
                Public
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStart(project.path, customCmd || undefined, false)}
                disabled={isStarting}
                className="w-full gap-1.5 hover:border-[var(--theme-accent)] hover:bg-transparent hover:text-[var(--theme-accent)]"
                title="Bind to 127.0.0.1 (Requires SSH Tunnel)"
              >
                {isStarting ? (
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={LockIcon} size={14} />
                )}
                Private
              </Button>
            </div>
          )}
        </div>

        {/* Logs */}
        {showLogs && (project.running || project.crashed) && (
          <LogViewer logs={project.recentLogs} />
        )}
      </div>
    </Panel>
  )
}

/* ── Main screen ─────────────────────────────────────────────────────── */

export function ProjectsScreen() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json() as Promise<{ projects: ProjectInfo[] }>
    },
    refetchInterval: POLL_MS,
  })

  const startMutation = useMutation({
    mutationFn: async ({ path, command, isPublic }: { path: string; command?: string; isPublic?: boolean }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', path, command, isPublic }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Failed to start')
      return json
    },
    onSuccess: () => {
      toast('Dev server started!', { type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to start server', { type: 'error' })
    },
  })

  const stopMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', path }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Failed to stop')
      return json
    },
    onSuccess: () => {
      toast('Dev server stopped', { type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to stop server', { type: 'error' })
    },
  })

  const projects = data?.projects ?? []
  const activeProjects = projects.filter((p) => p.running || p.crashed)
  const idleProjects = projects.filter((p) => !p.running && !p.crashed)
  const runningCount = projects.filter((p) => p.running).length

  const renderCard = (project: ProjectInfo) => (
    <ProjectCard
      key={project.path}
      project={project}
      onStart={(path, command, isPublic) => startMutation.mutate({ path, command, isPublic })}
      onStop={(path) => stopMutation.mutate(path)}
      isStarting={
        startMutation.isPending &&
        (startMutation.variables as { path: string })?.path === project.path
      }
      isStopping={stopMutation.isPending && stopMutation.variables === project.path}
    />
  )

  return (
    <div
      className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6"
      style={{ color: 'var(--theme-text)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
            Projects
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--theme-muted)' }}>
            Manage dev servers for projects in{' '}
            <code className="rounded bg-[var(--theme-card)] px-1 py-0.5 text-xs">
              ~/workspace
            </code>
            {runningCount > 0 && (
              <span
                className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--theme-success, #22c55e) 15%, transparent)',
                  color: 'var(--theme-success, #22c55e)',
                }}
              >
                {runningCount} running
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
          className="gap-1.5"
        >
          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} />
          Scan
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div
          className="flex items-center justify-center py-20 text-sm"
          style={{ color: 'var(--theme-muted)' }}
        >
          Scanning projects...
        </div>
      )}

      {/* Error */}
      {error && (
        <Panel>
          <p className="text-sm" style={{ color: 'var(--theme-danger)' }}>
            Failed to scan projects: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </Panel>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects.length === 0 && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-4xl">📂</span>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--theme-text)' }}
            >
              No projects found
            </h2>
            <p className="max-w-sm text-sm" style={{ color: 'var(--theme-muted)' }}>
              Create a project in{' '}
              <code className="rounded bg-[var(--theme-card)] px-1 py-0.5 text-xs">
                ~/workspace
              </code>{' '}
              using Hermes Agent (e.g. "buatkan project React di ~/workspace/my-app"), then
              come back here to start its dev server.
            </p>
          </div>
        </Panel>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="mb-2">
          <h2
            className="mb-3 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--theme-muted)' }}
          >
            Active Servers
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map(renderCard)}
          </div>
        </div>
      )}

      {/* Idle Projects */}
      {idleProjects.length > 0 && (
        <div>
          <h2
            className="mb-3 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--theme-muted)' }}
          >
            Workspace Projects
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {idleProjects.map(renderCard)}
          </div>
        </div>
      )}

      {/* Footer info */}
      {projects.length > 0 && (
        <p
          className="pb-4 px-4 text-center text-[10px]"
          style={{ color: 'var(--theme-muted)' }}
        >
          Supported: Flutter · Django · Laravel · Next.js · Vite · React · Node.js · Rust · Go · CodeIgniter 4 · Nuxt.js · SvelteKit · Vue.js · Angular · Ruby on Rails · Spring Boot · NestJS · Flask
        </p>
      )}
    </div>
  )
}
