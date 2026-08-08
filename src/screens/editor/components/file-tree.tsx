/**
 * FileTree — recursive file/folder explorer for the Code Editor.
 * Fetches entries from GET /api/files and renders them as a collapsible tree.
 */
import { useCallback, useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  File01Icon,
  Folder01Icon,
  FolderOpenIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────────────── */

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modifiedAt?: string
  children?: FileEntry[]
}

/* ── Language icon mapping (devicon local) ──────────────────────────── */

const EXT_ICON_MAP: Record<string, string> = {
  '.js': 'devicon-javascript-plain colored',
  '.mjs': 'devicon-javascript-plain colored',
  '.jsx': 'devicon-react-original colored',
  '.ts': 'devicon-typescript-plain colored',
  '.tsx': 'devicon-react-original colored',
  '.py': 'devicon-python-plain colored',
  '.rs': 'devicon-rust-original',
  '.go': 'devicon-go-original-wordmark colored',
  '.html': 'devicon-html5-plain colored',
  '.css': 'devicon-css3-plain colored',
  '.scss': 'devicon-sass-original colored',
  '.json': 'devicon-nodejs-plain colored',
  '.md': 'devicon-markdown-original',
  '.yaml': 'devicon-yaml-plain colored',
  '.yml': 'devicon-yaml-plain colored',
  '.toml': 'devicon-rust-original',
  '.sh': 'devicon-bash-plain',
  '.bash': 'devicon-bash-plain',
  '.vue': 'devicon-vuejs-plain colored',
  '.svelte': 'devicon-svelte-plain colored',
  '.php': 'devicon-php-plain colored',
  '.rb': 'devicon-ruby-plain colored',
  '.java': 'devicon-java-plain colored',
  '.kt': 'devicon-kotlin-plain colored',
  '.swift': 'devicon-swift-plain colored',
  '.dart': 'devicon-dart-plain colored',
  '.lua': 'devicon-lua-plain colored',
  '.sql': 'devicon-postgresql-plain colored',
  '.docker': 'devicon-docker-plain colored',
  '.dockerfile': 'devicon-docker-plain colored',
  '.gitignore': 'devicon-git-plain colored',
}

function getFileIcon(name: string): string | null {
  const lower = name.toLowerCase()
  // Check special filenames
  if (lower === 'dockerfile' || lower === 'docker-compose.yml' || lower === 'docker-compose.yaml') {
    return 'devicon-docker-plain colored'
  }
  if (lower === 'package.json' || lower === 'package-lock.json') {
    return 'devicon-npm-original-wordmark colored'
  }
  if (lower === '.gitignore' || lower === '.gitmodules') {
    return 'devicon-git-plain colored'
  }
  // Check extension
  const dotIdx = lower.lastIndexOf('.')
  if (dotIdx >= 0) {
    const ext = lower.slice(dotIdx)
    return EXT_ICON_MAP[ext] ?? null
  }
  return null
}

/* ── Formatting ─────────────────────────────────────────────────────── */

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── TreeNode ───────────────────────────────────────────────────────── */

function TreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
}: {
  entry: FileEntry
  depth: number
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const isFolder = entry.type === 'folder'
  const isSelected = selectedPath === entry.path

  const devIcon = !isFolder ? getFileIcon(entry.name) : null

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded)
          } else {
            onSelect(entry)
          }
        }}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors',
          'hover:bg-[var(--theme-card2)]',
          isSelected && 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]',
          !isSelected && 'text-[var(--theme-text)]',
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Chevron / spacer */}
        {isFolder ? (
          <HugeiconsIcon
            icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
            size={12}
            className="shrink-0 opacity-50"
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Icon */}
        {isFolder ? (
          <HugeiconsIcon
            icon={expanded ? FolderOpenIcon : Folder01Icon}
            size={14}
            className="shrink-0"
            style={{ color: 'var(--theme-warning, #f59e0b)' }}
          />
        ) : devIcon ? (
          <i className={cn(devIcon, 'shrink-0 text-[14px]')} />
        ) : (
          <HugeiconsIcon
            icon={File01Icon}
            size={14}
            className="shrink-0"
            style={{ color: 'var(--theme-muted)' }}
          />
        )}

        {/* Name */}
        <span className="min-w-0 truncate font-mono">{entry.name}</span>

        {/* Size on hover */}
        {!isFolder && entry.size != null && (
          <span className="ml-auto shrink-0 text-[10px] opacity-0 transition-opacity group-hover:opacity-50">
            {formatSize(entry.size)}
          </span>
        )}
      </button>

      {/* Children */}
      {isFolder && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── FileTree (root component) ──────────────────────────────────────── */

export function FileTree({
  selectedPath,
  onSelect,
  rootPath,
  refreshVersion,
}: {
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  rootPath?: string
  refreshVersion?: number
}) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ action: 'list', maxDepth: '3' })
      if (rootPath) params.set('path', rootPath)
      const res = await fetch(`/api/files?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { entries?: FileEntry[] }
      setEntries(data.entries ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [rootPath])

  useEffect(() => {
    void fetchTree()
  }, [fetchTree, refreshVersion])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-[var(--theme-muted)]">
        <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
        <span className="text-xs">Loading files…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <p className="text-xs text-[var(--theme-danger,#ef4444)]">{error}</p>
        <button
          type="button"
          onClick={() => void fetchTree()}
          className="rounded-md bg-[var(--theme-card2)] px-3 py-1 text-xs text-[var(--theme-text)] transition-colors hover:opacity-80"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="px-4 py-12 text-center text-xs text-[var(--theme-muted)]">
        No files found in workspace.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto py-1">
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
