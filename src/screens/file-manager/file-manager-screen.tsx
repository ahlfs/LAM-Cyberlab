/**
 * File Manager Screen — full filesystem browser for server/VPS administration.
 * Lazy-loads directories on click. Uses mode=browse API to access any path.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getFileIconClass } from '@/lib/file-icons'
import { usePageTitle } from '@/hooks/use-page-title'
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@/components/ui/scroll-area'
import { HamburgerTrigger } from '@/components/mobile-hamburger-menu'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ClipboardIcon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  Edit02Icon,
  File01Icon,
  Folder01Icon,
  FolderOpenIcon,
  Home01Icon,
  Loading03Icon,
  RefreshIcon,
  Scissor01Icon,
} from '@hugeicons/core-free-icons'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type FileEntry = {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modifiedAt?: string
  children?: Array<FileEntry>
}

type FilesListResponse = {
  root: string
  base: string
  entries: Array<FileEntry>
}

type FileReadResponse = {
  type: 'text' | 'image'
  path: string
  content: string
}

type PromptState = {
  mode: 'rename' | 'new-folder' | 'new-file'
  targetPath: string
  defaultValue?: string
}

type ContextMenuState = {
  x: number
  y: number
  entry: FileEntry | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'yml', 'yaml', 'sh', 'py', 'env', 'md', 'mdx', 'toml', 'rs', 'go', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'sql', 'xml', 'txt', 'log', 'conf', 'ini', 'cfg'])

function getExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(getExt(name))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getParentPath(pathValue: string): string {
  const parts = pathValue.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length <= 1) return '/'
  return '/' + parts.slice(0, -1).join('/')
}

// ──────────────────────────────────────────────────────────────────────────────
// Breadcrumb Navigation
// ──────────────────────────────────────────────────────────────────────────────

function PathBreadcrumb({ currentPath, onNavigate }: { currentPath: string; onNavigate: (path: string) => void }) {
  const parts = currentPath.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto text-sm">
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="shrink-0 rounded px-1.5 py-0.5 font-medium text-primary-500 hover:bg-primary-100 hover:text-primary-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
        title="Root /"
      >
        Root
      </button>
      {parts.map((part, i) => {
        const segmentPath = '/' + parts.slice(0, i + 1).join('/')
        const isLast = i === parts.length - 1
        return (
          <Fragment key={i}>
            <span className="shrink-0 text-primary-300 dark:text-neutral-600 text-xs">/</span>
            {isLast ? (
              <span className="shrink-0 rounded px-1.5 py-0.5 font-medium text-primary-800 dark:text-neutral-200">{part}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(segmentPath)}
                className="shrink-0 rounded px-1.5 py-0.5 text-primary-500 hover:bg-primary-100 hover:text-primary-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                {part}
              </button>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// File Row — table row for each entry
// ──────────────────────────────────────────────────────────────────────────────

function FileRow({
  entry,
  isSelected,
  onDoubleClick,
  onClick,
  onContextMenu,
}: {
  entry: FileEntry
  isSelected: boolean
  onDoubleClick: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const isFolder = entry.type === 'folder'
  const devIcon = !isFolder ? getFileIconClass(entry.name) : null

  const icon = isFolder ? (
    <HugeiconsIcon icon={Folder01Icon} size={16} className="text-amber-500" />
  ) : devIcon ? (
    <i className={cn(devIcon, 'text-[16px]')} />
  ) : (
    <HugeiconsIcon icon={File01Icon} size={16} className="opacity-50" />
  )
  return (
    <tr
      tabIndex={0}
      className={cn(
        'cursor-pointer select-none transition-colors text-sm focus:outline-none focus:ring-inset focus:ring-1 focus:ring-[var(--theme-accent)]',
        isSelected
          ? 'bg-primary-100 dark:bg-neutral-800'
          : 'hover:bg-primary-50 dark:hover:bg-neutral-900',
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <td className="py-2 pl-4 pr-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="shrink-0 text-base leading-none mt-0.5">{icon}</span>
          <span className="break-all">{entry.name}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-right text-xs text-primary-500 dark:text-neutral-500 whitespace-nowrap">
        {entry.type === 'file' && entry.size != null ? formatBytes(entry.size) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-primary-500 dark:text-neutral-500 whitespace-nowrap hidden md:table-cell">
        {entry.modifiedAt ? formatDate(entry.modifiedAt) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-primary-400 dark:text-neutral-600 whitespace-nowrap hidden lg:table-cell">
        {entry.type}
      </td>
    </tr>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// File Preview Panel
// ──────────────────────────────────────────────────────────────────────────────

function FilePreview({ entry }: { entry: FileEntry | null }) {
  const [content, setContent] = useState('')
  const [dataUrl, setDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!entry || entry.type === 'folder') {
      setContent('')
      setDataUrl('')
      prevPathRef.current = null
      return
    }
    if (prevPathRef.current === entry.path) return
    prevPathRef.current = entry.path

    void (async () => {
      setLoading(true)
      setError(null)
      setContent('')
      setDataUrl('')
      try {
        const res = await fetch(`/api/files?action=read&mode=browse&path=${encodeURIComponent(entry.path)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as FileReadResponse
        if (data.type === 'image') {
          setDataUrl(data.content)
        } else {
          setContent(data.content)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [entry])

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-primary-400 dark:text-neutral-600">
        Select a file to preview
      </div>
    )
  }

  if (entry.type === 'folder') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-primary-400 dark:text-neutral-600">
        <HugeiconsIcon icon={FolderOpenIcon} size={48} strokeWidth={1} />
        <span className="text-sm font-medium">{entry.name}</span>
        <span className="text-xs">Double-click to open</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-primary-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500 px-4 text-center">
        {error}
      </div>
    )
  }

  if (dataUrl) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-4">
        <img src={dataUrl} alt={entry.name} className="max-h-full max-w-full rounded-lg border border-primary-200 dark:border-neutral-700 shadow-sm object-contain" />
      </div>
    )
  }

  return (
    <ScrollAreaRoot className="h-full">
      <ScrollAreaViewport>
        <pre className="whitespace-pre-wrap break-words p-4 text-xs font-mono leading-relaxed text-primary-800 dark:text-neutral-300">
          {content || '(empty file)'}
        </pre>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main FileManagerScreen
// ──────────────────────────────────────────────────────────────────────────────

export function FileManagerScreen() {
  usePageTitle('File Manager')

  const [entries, setEntries] = useState<Array<FileEntry>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('file-manager-path') || ''
    }
    return ''
  })
  const [pathHistory, setPathHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [homedirResolved, setHomedirResolved] = useState(false)
  const homedirRef = useRef<string>('/')

  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut'; entry: FileEntry } | null>(null)

  // CRUD state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<FileEntry | null>(null)
  const [modalPreviewEntry, setModalPreviewEntry] = useState<FileEntry | null>(null)

  // ── Load directory ──────────────────────────────────────────────────────────

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        action: 'list',
        mode: 'browse',
        path: dirPath,
        maxDepth: '0',
      })
      const res = await fetch(`/api/files?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FilesListResponse & { homedir?: string }
      setEntries(Array.isArray(data.entries) ? data.entries : [])

      // Save homedir for the Home button
      if (data.homedir) homedirRef.current = data.homedir

      // On first load without a saved path, redirect to home directory
      if (!homedirResolved && data.homedir && !localStorage.getItem('file-manager-path')) {
        setHomedirResolved(true)
        setCurrentPath(data.homedir)
        return // will re-trigger via useEffect
      }
      setHomedirResolved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setHomedirResolved(true)
    } finally {
      setLoading(false)
    }
  }, [homedirResolved])

  // Persist currentPath
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPath) {
      localStorage.setItem('file-manager-path', currentPath)
    }
  }, [currentPath])

  // On first mount, if no saved path, fetch homedir
  useEffect(() => {
    if (!currentPath) {
      void loadDirectory('/')
    } else {
      void loadDirectory(currentPath)
    }
  }, [currentPath, loadDirectory])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', handleClick)
    window.addEventListener('contextmenu', handleClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('contextmenu', handleClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu])

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path)
    setSelectedEntry(null)
    setPathHistory(prev => [...prev.slice(0, historyIndex + 1), path])
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const goUp = useCallback(() => {
    if (currentPath === '/') return
    navigateTo(getParentPath(currentPath))
  }, [currentPath, navigateTo])

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return
    const prevPath = pathHistory[historyIndex - 1]
    setHistoryIndex(prev => prev - 1)
    setCurrentPath(prevPath)
    setSelectedEntry(null)
  }, [historyIndex, pathHistory])

  const goForward = useCallback(() => {
    if (historyIndex >= pathHistory.length - 1) return
    const nextPath = pathHistory[historyIndex + 1]
    setHistoryIndex(prev => prev + 1)
    setCurrentPath(nextPath)
    setSelectedEntry(null)
  }, [historyIndex, pathHistory])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDoubleClick = useCallback((entry: FileEntry) => {
    if (entry.type === 'folder') {
      navigateTo(entry.path)
    } else {
      // Show modal preview
      setModalPreviewEntry(entry)
    }
  }, [navigateTo])

  const handleSelect = useCallback((entry: FileEntry) => {
    setSelectedEntry(entry)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry | null) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, entry })
  }, [])

  // ── CRUD actions ────────────────────────────────────────────────────────────

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return
    await fetch('/api/files', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete', mode: 'browse', path: deleteConfirm.path }),
    })
    if (selectedEntry?.path === deleteConfirm.path) setSelectedEntry(null)
    setDeleteConfirm(null)
    await loadDirectory(currentPath)
  }, [deleteConfirm, selectedEntry, loadDirectory, currentPath])

  const handleDownload = useCallback(async (entry: FileEntry) => {
    const res = await fetch(`/api/files?action=download&mode=browse&path=${encodeURIComponent(entry.path)}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = entry.type === 'folder' ? `${entry.name}.zip` : entry.name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const openRenamePrompt = useCallback((entry: FileEntry) => {
    setPromptState({ mode: 'rename', targetPath: entry.path, defaultValue: entry.name })
    setPromptValue(entry.name)
  }, [])

  const openNewFolderPrompt = useCallback(() => {
    setPromptState({ mode: 'new-folder', targetPath: currentPath })
    setPromptValue('')
  }, [currentPath])

  const handlePaste = useCallback(async () => {
    if (!clipboard) return
    const targetFolder = contextMenu?.entry?.type === 'folder' ? contextMenu.entry.path : currentPath
    const targetPath = targetFolder + '/' + clipboard.entry.name

    const action = clipboard.action === 'copy' ? 'copy' : 'rename'
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, mode: 'browse', from: clipboard.entry.path, to: targetPath }),
    })

    if (res.ok) {
      if (clipboard.action === 'cut') {
        setClipboard(null)
      }
      await loadDirectory(currentPath)
    }
  }, [clipboard, contextMenu, currentPath, loadDirectory])

  const openNewFilePrompt = useCallback(() => {
    setPromptState({ mode: 'new-file', targetPath: currentPath })
    setPromptValue('')
  }, [currentPath])

  const handlePromptSubmit = useCallback(async () => {
    if (!promptState) return
    const value = promptValue.trim()
    if (!value) return

    if (promptState.mode === 'rename') {
      const parent = getParentPath(promptState.targetPath)
      const nextPath = `${parent === '/' ? '' : parent}/${value}`
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'rename', mode: 'browse', from: promptState.targetPath, to: nextPath }),
      })
    } else if (promptState.mode === 'new-folder') {
      const nextPath = `${promptState.targetPath === '/' ? '' : promptState.targetPath}/${value}`
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'mkdir', mode: 'browse', path: nextPath }),
      })
    } else if (promptState.mode === 'new-file') {
      const nextPath = `${promptState.targetPath === '/' ? '' : promptState.targetPath}/${value}`
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'write', mode: 'browse', path: nextPath, content: '' }),
      })
    }

    setPromptState(null)
    setPromptValue('')
    await loadDirectory(currentPath)
  }, [promptState, promptValue, loadDirectory, currentPath])

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (selectedEntry) {
          e.preventDefault()
          setClipboard({ action: 'copy', entry: selectedEntry })
        }
      } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
        if (selectedEntry) {
          e.preventDefault()
          setClipboard({ action: 'cut', entry: selectedEntry })
        }
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void handlePaste()
      } else if (e.key === 'Delete') {
        if (selectedEntry) {
          e.preventDefault()
          setDeleteConfirm(selectedEntry)
        }
      } else if (e.key === 'F2') {
        if (selectedEntry) {
          e.preventDefault()
          openRenamePrompt(selectedEntry)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEntry, handlePaste, openRenamePrompt])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-primary-50/95 dark:bg-neutral-950">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-primary-200 dark:border-neutral-800 px-3 py-2">
        <div className="md:hidden">
          <HamburgerTrigger />
        </div>
        {/* Navigation buttons */}
        <button type="button" onClick={goBack} disabled={historyIndex <= 0} title="Back" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
        </button>
        <button type="button" onClick={goForward} disabled={historyIndex >= pathHistory.length - 1} title="Forward" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </button>
        <button type="button" onClick={goUp} disabled={currentPath === '/'} title="Go up" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
          ⬆
        </button>
        <button type="button" onClick={() => navigateTo(homedirRef.current)} title="Home directory" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors">
          <HugeiconsIcon icon={Home01Icon} size={18} />
        </button>
        <button type="button" onClick={() => void loadDirectory(currentPath)} title="Refresh" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors">
          <HugeiconsIcon icon={RefreshIcon} size={18} />
        </button>

        <div className="hidden md:block mx-2 h-5 w-px bg-primary-200 dark:bg-neutral-700" />

        {/* Breadcrumb */}
        <div className="w-full md:w-auto md:flex-1 min-w-0 order-3 md:order-none mt-2 md:mt-0 bg-white/50 dark:bg-neutral-900/50 md:bg-transparent rounded px-2 py-1.5 md:p-0">
          <PathBreadcrumb currentPath={currentPath} onNavigate={navigateTo} />
        </div>

        <div className="hidden md:block mx-2 h-5 w-px bg-primary-200 dark:bg-neutral-700" />

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-auto md:ml-0 order-2 md:order-none">
          <button type="button" onClick={openNewFilePrompt} title="New file" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors">
            <HugeiconsIcon icon={File01Icon} size={16} />
          </button>
          <button type="button" onClick={openNewFolderPrompt} title="New folder" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors">
            <HugeiconsIcon icon={Folder01Icon} size={16} />
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File table */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-white dark:bg-neutral-900 overflow-hidden relative">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-primary-400 dark:text-neutral-600">
              <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-sm text-red-500">
              <p>{error}</p>
              <p className="mt-1 text-xs text-primary-400">Cannot access this directory.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-primary-400 dark:text-neutral-600">
              This directory is empty.
            </div>
          ) : (
            <ScrollAreaRoot className="flex-1 min-h-0 w-full" onContextMenu={(e) => handleContextMenu(e, null)}>
              <ScrollAreaViewport className="h-full w-full [&>div]:!block">
                <table className="w-full text-left table-fixed">
                  <thead className="sticky top-0 z-10 bg-primary-100/80 dark:bg-neutral-900/80 backdrop-blur-sm text-xs text-primary-500 dark:text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 pl-4 pr-2 font-medium">Name</th>
                      <th className="py-2 px-3 text-right font-medium w-24">Size</th>
                      <th className="py-2 px-3 font-medium hidden md:table-cell w-44">Modified</th>
                      <th className="py-2 px-3 font-medium hidden lg:table-cell w-20">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100 dark:divide-neutral-800/50">
                    {entries.map((entry) => (
                      <FileRow
                        key={entry.path}
                        entry={entry}
                        isSelected={selectedEntry?.path === entry.path}
                        onClick={() => handleSelect(entry)}
                        onDoubleClick={() => handleDoubleClick(entry)}
                        onContextMenu={(e) => handleContextMenu(e, entry)}
                      />
                    ))}
                  </tbody>
                </table>
              </ScrollAreaViewport>
              <ScrollAreaScrollbar orientation="vertical">
                <ScrollAreaThumb />
              </ScrollAreaScrollbar>
              <ScrollAreaCorner />
            </ScrollAreaRoot>
          )}

          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-primary-200 dark:border-neutral-800 px-4 py-1.5 text-xs text-primary-500 dark:text-neutral-500">
            <span>{entries.length} items</span>
            <span>{currentPath}</span>
          </div>
        </div>
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] rounded-lg bg-primary-50 dark:bg-neutral-900 p-1 text-sm text-primary-900 dark:text-neutral-100 shadow-xl outline outline-primary-900/10 dark:outline-neutral-700"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry && (
            <>
              {contextMenu.entry.type === 'folder' && (
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { navigateTo(contextMenu.entry!.path); setContextMenu(null) }}>
                  <HugeiconsIcon icon={FolderOpenIcon} size={16} /> Open
                </button>
              )}
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { setClipboard({ action: 'cut', entry: contextMenu.entry! }); setContextMenu(null) }}>
                <HugeiconsIcon icon={Scissor01Icon} size={16} /> Cut
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { setClipboard({ action: 'copy', entry: contextMenu.entry! }); setContextMenu(null) }}>
                <HugeiconsIcon icon={Copy01Icon} size={16} /> Copy
              </button>
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { openRenamePrompt(contextMenu.entry!); setContextMenu(null) }}>
                <HugeiconsIcon icon={Edit02Icon} size={16} /> Rename
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { void handleDownload(contextMenu.entry!); setContextMenu(null) }}>
                <HugeiconsIcon icon={Download01Icon} size={16} /> Download
              </button>
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
            </>
          )}

          {(!contextMenu.entry || contextMenu.entry.type === 'folder') && clipboard && (
            <>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { void handlePaste(); setContextMenu(null) }}>
                <HugeiconsIcon icon={ClipboardIcon} size={16} /> Paste
              </button>
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
            </>
          )}

          {contextMenu.entry && (
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" onClick={() => { setDeleteConfirm(contextMenu.entry!); setContextMenu(null) }}>
              <HugeiconsIcon icon={Delete01Icon} size={16} /> Delete
            </button>
          )}
        </div>
      )}

      {/* ── Rename / New folder / New file dialog ─────────────────────────── */}
      <DialogRoot open={Boolean(promptState)} onOpenChange={(open) => { if (!open) setPromptState(null) }}>
        <DialogContent>
          <div className="p-5 space-y-3">
            <DialogTitle>
              {promptState?.mode === 'rename' ? 'Rename' : promptState?.mode === 'new-folder' ? 'New Folder' : 'New File'}
            </DialogTitle>
            <DialogDescription>
              {promptState?.mode === 'rename' ? 'Enter a new name.' : 'Enter a name to create.'}
            </DialogDescription>
            <input
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void handlePromptSubmit() }}
              className="w-full rounded-md border border-primary-200 dark:border-neutral-700 bg-primary-50 dark:bg-neutral-900 px-3 py-2 text-sm text-primary-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-300"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={() => void handlePromptSubmit()}>
                {promptState?.mode === 'rename' ? 'Rename' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <DialogRoot open={Boolean(deleteConfirm)} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent>
          <div className="p-5 space-y-3">
            <DialogTitle>Delete {deleteConfirm?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
              {deleteConfirm?.type === 'folder' && ' This will delete all contents inside.'}
              {' '}This action cannot be undone.
            </DialogDescription>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button variant="destructive" onClick={() => void handleDeleteConfirmed()}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>

      {/* ── Mobile file preview dialog ─────────────────────────────────────── */}
      <DialogRoot open={Boolean(modalPreviewEntry)} onOpenChange={(open) => { if (!open) setModalPreviewEntry(null) }}>
        <DialogContent className="max-w-[95vw] w-[500px] h-[80vh] p-0 flex flex-col overflow-hidden bg-primary-50 dark:bg-neutral-950">
          <div className="flex shrink-0 items-center justify-between border-b border-primary-200 dark:border-neutral-800 px-4 py-3 bg-white dark:bg-neutral-900">
            <DialogTitle className="text-sm font-semibold truncate pr-4">{modalPreviewEntry?.name}</DialogTitle>
            <DialogClose render={
              <button type="button" className="text-xs text-primary-400 hover:text-primary-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors">
                ✕
              </button>
            } />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-neutral-900">
            <FilePreview entry={modalPreviewEntry} />
          </div>
          {modalPreviewEntry && (
            <div className="shrink-0 border-t border-primary-200 dark:border-neutral-800 px-4 py-3 space-y-1 text-xs text-primary-500 dark:text-neutral-500 bg-white dark:bg-neutral-900">
              {modalPreviewEntry.size != null && <div>Size: {formatBytes(modalPreviewEntry.size)}</div>}
              {modalPreviewEntry.modifiedAt && <div>Modified: {formatDate(modalPreviewEntry.modifiedAt)}</div>}
              <div className="truncate text-[10px] text-primary-400 dark:text-neutral-600">{modalPreviewEntry.path}</div>
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  )
}
