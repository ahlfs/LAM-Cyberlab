/**
 * FileTree — recursive file/folder explorer for the Code Editor.
 * Fetches entries from GET /api/files and renders them as a collapsible tree.
 */
import { useCallback, useEffect, useState, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  File01Icon,
  Folder01Icon,
  FolderOpenIcon,
  Loading03Icon,
  Delete02Icon,
  Copy01Icon,
  Scissor01Icon,
  ClipboardIcon,
  Edit02Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { FileIcon } from '@/components/ui/file-icon'

/* ── Types ──────────────────────────────────────────────────────────── */

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modifiedAt?: string
  children?: FileEntry[]
}

/* ── Formatting ─────────────────────────────────────────────────────── */

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── Context Menu State ─────────────────────────────────────────────── */

export type ContextMenuState = {
  isOpen: boolean
  x: number
  y: number
  entry: FileEntry | null
}

function useLongPress(callback: (e: React.TouchEvent | React.MouseEvent) => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      callback(e)
    }, ms)
  }, [callback, ms])

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return {
    handlers: {
      onTouchStart: start,
      onTouchEnd: stop,
      onTouchMove: stop,
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
    },
    isLongPress,
  }
}

/* ── TreeNode ───────────────────────────────────────────────────────── */

function TreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onContextMenu,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onDelete,
}: {
  entry: FileEntry
  depth: number
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, entry: FileEntry | null) => void
  clipboard: { type: 'copy' | 'cut'; entry: FileEntry } | null
  onCopy?: (entry: FileEntry) => void
  onCut?: (entry: FileEntry) => void
  onPaste?: (target: FileEntry | null) => void
  onRename?: (entry: FileEntry) => void
  onDelete?: (entry: FileEntry) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const isFolder = entry.type === 'folder'
  const isSelected = selectedPath === entry.path
  const isCut = clipboard?.type === 'cut' && clipboard.entry.path === entry.path

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, entry)
  }

  const { handlers, isLongPress } = useLongPress(handleContextMenu)

  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          if (isLongPress.current) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          if (isFolder) {
            setExpanded(!expanded)
          } else {
            onSelect(entry)
          }
        }}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onCopy?.(entry)
          }
          if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onCut?.(entry)
          }
          if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onPaste?.(entry)
          }
          if (e.key === 'Delete') {
            e.preventDefault()
            onDelete?.(entry)
          }
          if (e.key === 'F2') {
            e.preventDefault()
            onRename?.(entry)
          }
        }}
        {...handlers}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors',
          'hover:bg-[var(--theme-card2)]',
          isSelected && 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]',
          !isSelected && 'text-[var(--theme-text)]',
          isCut && 'opacity-50',
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
        <FileIcon name={entry.name} type={entry.type} size={14} className="shrink-0" />

        {/* Name */}
        <span className="min-w-0 truncate font-mono">{entry.name}</span>

        {/* Size on hover */}
        {!isFolder && entry.size != null && (
          <div className="ml-auto flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 transition-opacity lg:group-hover:opacity-100">
            <span className="text-[10px] text-[var(--theme-muted)]">
              {formatSize(entry.size)}
            </span>
          </div>
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
              onContextMenu={onContextMenu}
              clipboard={clipboard}
              onCopy={onCopy}
              onCut={onCut}
              onPaste={onPaste}
              onRename={onRename}
              onDelete={onDelete}
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
  onDelete,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onRename,
}: {
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  rootPath?: string
  refreshVersion?: number
  onDelete?: (entry: FileEntry) => void
  clipboard?: { type: 'copy' | 'cut'; entry: FileEntry } | null
  onCopy?: (entry: FileEntry) => void
  onCut?: (entry: FileEntry) => void
  onPaste?: (target: FileEntry | null) => void
  onRename?: (entry: FileEntry) => void
}) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, entry: null })

  // Close context menu on outside click/touch
  useEffect(() => {
    const handleClose = () => setContextMenu((prev) => ({ ...prev, isOpen: false }))
    window.addEventListener('click', handleClose)
    window.addEventListener('touchstart', handleClose)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('touchstart', handleClose)
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, entry: FileEntry | null) => {
    e.preventDefault()
    e.stopPropagation()
    let x = 0
    let y = 0
    if ('touches' in e) {
      x = e.touches[0].clientX
      y = e.touches[0].clientY
    } else {
      x = e.clientX
      y = e.clientY
    }
    setContextMenu({ isOpen: true, x, y, entry })
  }, [])

  const { handlers: rootHandlers } = useLongPress((e) => handleContextMenu(e, null))

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
    <div 
      className="flex flex-col gap-0.5 overflow-y-auto py-1"
      onContextMenu={(e) => handleContextMenu(e, null)}
      {...rootHandlers}
    >
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onContextMenu={handleContextMenu}
          clipboard={clipboard || null}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}

      {contextMenu.isOpen && (
        <div 
          className="fixed z-[100000] flex w-48 flex-col rounded-md border bg-[var(--theme-card)] p-1 shadow-lg text-[var(--theme-text)] text-sm"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x, 
            borderColor: 'var(--theme-border)',
            transform: 'translate(min(0px, calc(100vw - 100% - 10px)), min(0px, calc(100vh - 100% - 10px)))'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry && (
            <>
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--theme-card2)] transition-colors"
                onClick={() => {
                  onCut?.(contextMenu.entry!)
                  setContextMenu(prev => ({ ...prev, isOpen: false }))
                }}
              >
                <HugeiconsIcon icon={Scissor01Icon} size={14} className="opacity-70" />
                <span>Cut</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--theme-card2)] transition-colors"
                onClick={() => {
                  onCopy?.(contextMenu.entry!)
                  setContextMenu(prev => ({ ...prev, isOpen: false }))
                }}
              >
                <HugeiconsIcon icon={Copy01Icon} size={14} className="opacity-70" />
                <span>Copy</span>
              </button>
              <div className="my-1 border-t opacity-30" style={{ borderColor: 'var(--theme-border)' }} />
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--theme-card2)] transition-colors"
                onClick={() => {
                  onRename?.(contextMenu.entry!)
                  setContextMenu(prev => ({ ...prev, isOpen: false }))
                }}
              >
                <HugeiconsIcon icon={Edit02Icon} size={14} className="opacity-70" />
                <span>Rename</span>
              </button>
            </>
          )}

          {(!contextMenu.entry || contextMenu.entry.type === 'folder') && clipboard && (
            <button
              type="button"
              className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--theme-card2)] transition-colors text-[var(--theme-accent)]"
              onClick={() => {
                onPaste?.(contextMenu.entry)
                setContextMenu(prev => ({ ...prev, isOpen: false }))
              }}
            >
              <HugeiconsIcon icon={ClipboardIcon} size={14} className="opacity-70" />
              <span>Paste</span>
            </button>
          )}

          {contextMenu.entry && onDelete && (
            <>
              <div className="my-1 border-t opacity-30" style={{ borderColor: 'var(--theme-border)' }} />
              <button
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-red-500/10 text-red-500 transition-colors"
                onClick={() => {
                  onDelete(contextMenu.entry!)
                  setContextMenu(prev => ({ ...prev, isOpen: false }))
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} className="opacity-70" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
