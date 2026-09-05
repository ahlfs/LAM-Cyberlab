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
import { toast } from '@/components/ui/toast'
import { FileIcon } from '@/components/ui/file-icon'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ClipboardIcon,
  CloudUploadIcon,
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
  CheckListIcon,
  Archive01Icon,
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
  isMultiSelectMode,
  onDoubleClick,
  onClick,
  onContextMenu,
}: {
  entry: FileEntry
  isSelected: boolean
  isMultiSelectMode: boolean
  onDoubleClick: () => void
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const isFolder = entry.type === 'folder'

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
      {isMultiSelectMode && (
        <td className="py-2 pl-4 pr-1 w-10">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="w-4 h-4 text-primary-600 rounded border-primary-300 dark:border-neutral-600 bg-transparent focus:ring-primary-500"
            />
          </div>
        </td>
      )}
      <td className={cn("py-2 pr-2", isMultiSelectMode ? "pl-1" : "pl-4")}>
        <div className="flex items-start gap-2 min-w-0">
          <span className="shrink-0 text-base leading-none mt-0.5">
            <FileIcon name={entry.name} type={entry.type} size={16} className={isFolder ? "text-amber-500" : ""} />
          </span>
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
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  const [history, setHistory] = useState<{ stack: string[], index: number }>(() => {
    let initial = ''
    if (typeof window !== 'undefined') {
      initial = localStorage.getItem('file-manager-path') || ''
    }
    return { stack: [initial || '/'], index: 0 }
  })
  const currentPath = history.stack[history.index] || '/'

  // Update local storage when path changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('file-manager-path', currentPath)
    }
  }, [currentPath])

  const [homedirResolved, setHomedirResolved] = useState(false)
  const homedirRef = useRef<string>('/')

  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut'; entries: FileEntry[] } | null>(null)

  // CRUD state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Ensure context menu stays within viewport
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contextMenu) {
      setMenuPosition(null)
      return
    }

    const updatePosition = () => {
      const padding = 12
      const el = contextMenuRef.current
      const width = el ? el.offsetWidth : 200
      const height = el ? el.offsetHeight : 280

      let nextX = contextMenu.x
      let nextY = contextMenu.y

      if (nextX + width > window.innerWidth - padding) {
        nextX = Math.max(padding, window.innerWidth - width - padding)
      }
      if (nextY + height > window.innerHeight - padding) {
        nextY = Math.max(padding, window.innerHeight - height - padding)
      }

      setMenuPosition({ x: Math.max(padding, nextX), y: Math.max(padding, nextY) })
    }

    // Run layout calculation after render
    updatePosition()
    const raf = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(raf)
  }, [contextMenu])
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false)
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
        setHistory(prev => {
          if (prev.stack[0] === '' || prev.stack[0] === '/') {
            return { stack: [data.homedir!], index: 0 }
          }
          return prev
        })
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
    setSelectedPaths(new Set())
    setLastSelectedIndex(null)
    setHistory(prev => {
      if (prev.stack[prev.index] === path) return prev
      const newStack = [...prev.stack.slice(0, prev.index + 1), path]
      return { stack: newStack, index: newStack.length - 1 }
    })
  }, [])

  const goUp = useCallback(() => {
    if (currentPath === '/') return
    navigateTo(getParentPath(currentPath))
  }, [currentPath, navigateTo])

  const goBack = useCallback(() => {
    setSelectedPaths(new Set())
    setLastSelectedIndex(null)
    setHistory(prev => ({
      ...prev,
      index: Math.max(0, prev.index - 1)
    }))
  }, [])

  const goForward = useCallback(() => {
    setSelectedPaths(new Set())
    setLastSelectedIndex(null)
    setHistory(prev => ({
      ...prev,
      index: Math.min(prev.stack.length - 1, prev.index + 1)
    }))
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDoubleClick = useCallback((entry: FileEntry) => {
    if (entry.type === 'folder') {
      navigateTo(entry.path)
    } else {
      // Show modal preview
      setModalPreviewEntry(entry)
    }
  }, [navigateTo])

  const handleSelect = useCallback((e: React.MouseEvent, entry: FileEntry, index: number) => {
    e.stopPropagation()
    setSelectedPaths(prev => {
      const newSet = new Set(prev)
      if (e.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        newSet.clear() // Optional: clear or add to existing selection? Standard shift-click clears other selection usually, but we'll just add for now, wait, let's clear and add range.
        for (let i = start; i <= end; i++) {
          newSet.add(entries[i].path)
        }
      } else if (e.ctrlKey || e.metaKey || isMultiSelectMode) {
        if (newSet.has(entry.path)) {
          newSet.delete(entry.path)
        } else {
          newSet.add(entry.path)
        }
        setLastSelectedIndex(index)
      } else {
        newSet.clear()
        newSet.add(entry.path)
        setLastSelectedIndex(index)
      }
      return newSet
    })
  }, [entries, lastSelectedIndex, isMultiSelectMode])

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry | null) => {
    e.preventDefault()
    e.stopPropagation()
    if (entry && !selectedPaths.has(entry.path)) {
      setSelectedPaths(new Set([entry.path]))
      const idx = entries.findIndex(x => x.path === entry.path)
      setLastSelectedIndex(idx >= 0 ? idx : null)
    }
    setContextMenu({ x: e.clientX, y: e.clientY, entry })
  }, [selectedPaths, entries])

  // ── CRUD actions ────────────────────────────────────────────────────────────

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm || selectedPaths.size === 0) return
    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPaths).map(path =>
          fetch('/api/files', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'delete', mode: 'browse', path }),
          })
        )
      )
      toast(`Deleted ${selectedPaths.size} item(s)`, { type: 'success' })
      setSelectedPaths(new Set())
      setLastSelectedIndex(null)
      setDeleteConfirm(false)
      await loadDirectory(currentPath)
    } catch (err: any) {
      toast(err.message, { type: 'error' })
      setLoading(false)
    }
  }, [deleteConfirm, selectedPaths, loadDirectory, currentPath])

  const handleDownload = useCallback((paths: Set<string>) => {
    if (paths.size === 0) return
    toast(`Starting download for ${paths.size} item(s)...`, { type: 'info' })
    Array.from(paths).forEach(path => {
      const entry = entries.find(e => e.path === path)
      if (!entry) return
      const url = `/api/files?action=download&mode=browse&path=${encodeURIComponent(path)}`
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = entry.type === 'folder' ? `${entry.name}.zip` : entry.name
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    })
  }, [entries])

  const handleZip = useCallback(async (paths: Set<string>) => {
    if (paths.size === 0) return
    const pathList = Array.from(paths)
    const firstEntry = entries.find(e => e.path === pathList[0])
    const defaultZipName = pathList.length === 1 && firstEntry
      ? `${firstEntry.name.replace(/\.[^/.]+$/, '')}.zip`
      : 'archive.zip'
    
    const zipName = window.prompt('Enter archive name (.zip):', defaultZipName)
    if (!zipName) return
    const finalZipName = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`
    const targetZipPath = `${currentPath === '/' ? '' : currentPath}/${finalZipName}`

    setLoading(true)
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'zip',
          mode: 'browse',
          paths: pathList,
          zipPath: targetZipPath,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || `Zip failed: ${res.statusText}`)
      }
      toast(`Created archive ${finalZipName}`, { type: 'success' })
      await loadDirectory(currentPath)
    } catch (err: any) {
      toast(err.message, { type: 'error' })
      setLoading(false)
    }
  }, [entries, currentPath, loadDirectory])

  const handleUnzip = useCallback(async (zipEntry: FileEntry) => {
    setLoading(true)
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'unzip',
          mode: 'browse',
          path: zipEntry.path,
          destination: currentPath,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || `Unzip failed: ${res.statusText}`)
      }
      const data = await res.json().catch(() => ({}))
      toast(`Extracted ${data.count ?? ''} files from ${zipEntry.name}`, { type: 'success' })
      await loadDirectory(currentPath)
    } catch (err: any) {
      toast(err.message, { type: 'error' })
      setLoading(false)
    }
  }, [currentPath, loadDirectory])

  const openRenamePrompt = useCallback((entry: FileEntry) => {
    setPromptState({ mode: 'rename', targetPath: entry.path, defaultValue: entry.name })
    setPromptValue(entry.name)
  }, [])

  const openNewFolderPrompt = useCallback(() => {
    setPromptState({ mode: 'new-folder', targetPath: currentPath })
    setPromptValue('')
  }, [currentPath])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : []
      if (files.length === 0) return

      setLoading(true)
      try {
        const formData = new FormData()
        formData.append('action', 'upload')
        formData.append('path', currentPath)
        formData.append('mode', 'browse')
        for (const file of files) {
          formData.append('files', file)
        }

        const res = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          throw new Error(errorData?.error || `Upload failed: ${res.statusText}`)
        }

        toast(files.length > 1 ? `Uploaded ${files.length} files` : `Uploaded ${files[0].name}`, { type: 'success' })
        void loadDirectory(currentPath)
      } catch (err: any) {
        toast(err.message, { type: 'error' })
        setLoading(false)
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [currentPath, loadDirectory]
  )

  const handlePaste = useCallback(async () => {
    if (!clipboard || clipboard.entries.length === 0) return
    const targetFolder = contextMenu?.entry?.type === 'folder' ? contextMenu.entry.path : currentPath
    
    setLoading(true)
    try {
      await Promise.all(
        clipboard.entries.map(entry => {
          const targetPath = targetFolder + '/' + entry.name
          const action = clipboard.action === 'copy' ? 'copy' : 'rename'
          return fetch('/api/files', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action, mode: 'browse', from: entry.path, to: targetPath }),
          })
        })
      )
      toast(`Pasted ${clipboard.entries.length} item(s)`, { type: 'success' })
      if (clipboard.action === 'cut') {
        setClipboard(null)
      }
      await loadDirectory(currentPath)
    } catch (err: any) {
      toast(err.message, { type: 'error' })
      setLoading(false)
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
        if (selectedPaths.size > 0) {
          e.preventDefault()
          const entriesToCopy = entries.filter(entry => selectedPaths.has(entry.path))
          setClipboard({ action: 'copy', entries: entriesToCopy })
        }
      } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
        if (selectedPaths.size > 0) {
          e.preventDefault()
          const entriesToCut = entries.filter(entry => selectedPaths.has(entry.path))
          setClipboard({ action: 'cut', entries: entriesToCut })
        }
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void handlePaste()
      } else if (e.key === 'Delete') {
        if (selectedPaths.size > 0) {
          e.preventDefault()
          setDeleteConfirm(true)
        }
      } else if (e.key === 'F2') {
        if (selectedPaths.size === 1) {
          e.preventDefault()
          const selectedPath = Array.from(selectedPaths)[0]
          const entry = entries.find(e => e.path === selectedPath)
          if (entry) openRenamePrompt(entry)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPaths, entries, handlePaste, openRenamePrompt])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-primary-50/95 dark:bg-neutral-950">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-primary-200 dark:border-neutral-800 px-3 py-2">
        <div className="md:hidden">
          <HamburgerTrigger />
        </div>
        {/* Navigation buttons */}
        <button type="button" onClick={goBack} disabled={history.index <= 0} title="Back" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
        </button>
        <button type="button" onClick={goForward} disabled={history.index >= history.stack.length - 1} title="Forward" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
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
          <button type="button" onClick={() => {
            setIsMultiSelectMode(!isMultiSelectMode)
            setSelectedPaths(new Set())
            setLastSelectedIndex(null)
          }} title="Toggle Multi-Select" className={cn("rounded p-1.5 transition-colors", isMultiSelectMode ? "bg-primary-200 text-primary-800 dark:bg-neutral-800 dark:text-neutral-100" : "text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800")}>
            <HugeiconsIcon icon={CheckListIcon} size={16} />
          </button>
          <div className="h-4 w-px bg-primary-200 dark:bg-neutral-700 mx-1" />
          <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Upload file" className="rounded p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors">
            <HugeiconsIcon icon={CloudUploadIcon} size={16} />
          </button>
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
                      {isMultiSelectMode && (
                        <th className="py-2 pl-4 pr-1 font-medium w-10">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={entries.length > 0 && selectedPaths.size === entries.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPaths(new Set(entries.map(x => x.path)))
                                } else {
                                  setSelectedPaths(new Set())
                                }
                                setLastSelectedIndex(null)
                              }}
                              className="w-4 h-4 text-primary-600 rounded border-primary-300 dark:border-neutral-600 bg-transparent focus:ring-primary-500 cursor-pointer"
                            />
                          </div>
                        </th>
                      )}
                      <th className={cn("py-2 pr-2 font-medium", isMultiSelectMode ? "pl-1" : "pl-4")}>Name</th>
                      <th className="py-2 px-3 text-right font-medium w-24">Size</th>
                      <th className="py-2 px-3 font-medium hidden md:table-cell w-44">Modified</th>
                      <th className="py-2 px-3 font-medium hidden lg:table-cell w-20">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100 dark:divide-neutral-800/50">
                    {entries.map((entry, index) => (
                      <FileRow
                        key={entry.path}
                        entry={entry}
                        isSelected={selectedPaths.has(entry.path)}
                        isMultiSelectMode={isMultiSelectMode}
                        onClick={(e) => handleSelect(e, entry, index)}
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
          ref={contextMenuRef}
          className="fixed z-50 min-w-[180px] rounded-lg bg-primary-50 dark:bg-neutral-900 p-1 text-sm text-primary-900 dark:text-neutral-100 shadow-xl outline outline-primary-900/10 dark:outline-neutral-700"
          style={{
            top: menuPosition ? menuPosition.y : contextMenu.y,
            left: menuPosition ? menuPosition.x : contextMenu.x,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry && (
            <>
              {contextMenu.entry.type === 'folder' && selectedPaths.size === 1 && (
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { navigateTo(contextMenu.entry!.path); setContextMenu(null) }}>
                  <HugeiconsIcon icon={FolderOpenIcon} size={16} /> Open
                </button>
              )}
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { 
                const entriesToCut = entries.filter(e => selectedPaths.has(e.path));
                setClipboard({ action: 'cut', entries: entriesToCut }); 
                setContextMenu(null) 
              }}>
                <HugeiconsIcon icon={Scissor01Icon} size={16} /> Cut {selectedPaths.size > 1 ? `(${selectedPaths.size})` : ''}
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { 
                const entriesToCopy = entries.filter(e => selectedPaths.has(e.path));
                setClipboard({ action: 'copy', entries: entriesToCopy }); 
                setContextMenu(null) 
              }}>
                <HugeiconsIcon icon={Copy01Icon} size={16} /> Copy {selectedPaths.size > 1 ? `(${selectedPaths.size})` : ''}
              </button>
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
              {selectedPaths.size === 1 && (
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { openRenamePrompt(contextMenu.entry!); setContextMenu(null) }}>
                  <HugeiconsIcon icon={Edit02Icon} size={16} /> Rename
                </button>
              )}
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { void handleDownload(selectedPaths); setContextMenu(null) }}>
                <HugeiconsIcon icon={Download01Icon} size={16} /> Download {selectedPaths.size > 1 ? `(${selectedPaths.size})` : ''}
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { void handleZip(selectedPaths); setContextMenu(null) }}>
                <HugeiconsIcon icon={Archive01Icon} size={16} /> Compress to ZIP {selectedPaths.size > 1 ? `(${selectedPaths.size})` : ''}
              </button>
              {selectedPaths.size === 1 && contextMenu.entry.name.toLowerCase().endsWith('.zip') && (
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors text-amber-600 dark:text-amber-400" onClick={() => { void handleUnzip(contextMenu.entry!); setContextMenu(null) }}>
                  <HugeiconsIcon icon={Archive01Icon} size={16} /> Extract ZIP Here
                </button>
              )}
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
            </>
          )}

          {(!contextMenu.entry || (contextMenu.entry.type === 'folder' && selectedPaths.size === 1)) && clipboard && (
            <>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => { void handlePaste(); setContextMenu(null) }}>
                <HugeiconsIcon icon={ClipboardIcon} size={16} /> Paste {clipboard.entries.length > 1 ? `(${clipboard.entries.length})` : ''}
              </button>
              <div className="my-1 border-t border-primary-200 dark:border-neutral-800 mx-1" />
            </>
          )}

          {contextMenu.entry && (
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" onClick={() => { setDeleteConfirm(true); setContextMenu(null) }}>
              <HugeiconsIcon icon={Delete01Icon} size={16} /> Delete {selectedPaths.size > 1 ? `(${selectedPaths.size})` : ''}
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
      <DialogRoot open={deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(false) }}>
        <DialogContent>
          <div className="p-5 space-y-3">
            <DialogTitle>Delete {selectedPaths.size > 1 ? 'Files' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedPaths.size === 1 ? Array.from(selectedPaths)[0].split('/').pop() : `${selectedPaths.size} items`}</strong>?
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
