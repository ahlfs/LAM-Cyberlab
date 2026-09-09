/**
 * EditorScreen — Native web-based code editor powered by Monaco Editor.
 *
 * Features:
 * - Folder selector (dropdown of detected projects)
 * - File tree sidebar (fetched from /api/files)
 * - Monaco code editor with syntax highlighting
 * - Multi-tab editing
 * - Save via Ctrl+S → POST /api/files
 * - Integrated terminal panel (xterm.js)
 * - Devicon file icons
 */
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels'
import Editor, { type OnMount } from '@monaco-editor/react'
import * as Diff from 'diff'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  ComputerTerminal01Icon,
  File01Icon,
  FloppyDiskIcon,
  Folder01Icon,
  GitBranchIcon,
  Loading03Icon,
  Menu01Icon,
  PlusSignIcon,
  ReloadIcon,
  Search01Icon,
  SidebarLeft01Icon,
  StarIcon,
  Message02Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileTree, type FileEntry } from './components/file-tree'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useChatSessions } from '@/screens/chat/hooks/use-chat-sessions'

const EditorTerminal = lazy(() =>
  import('./components/editor-terminal').then((m) => ({
    default: m.EditorTerminal,
  })),
)

const EditorChatScreen = lazy(() =>
  import('@/screens/chat/chat-screen').then((m) => ({
    default: m.ChatScreen,
  })),
)

/* ── Helpers ────────────────────────────────────────────────────────── */

function extToLanguage(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  const map: Record<string, string> = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.md': 'markdown',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.rb': 'ruby',
    '.php': 'php',
    '.sh': 'shell',
    '.bash': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'ini',
    '.xml': 'xml',
    '.sql': 'sql',
    '.vue': 'html',
    '.svelte': 'html',
    '.lua': 'lua',
    '.dart': 'dart',
    '.dockerfile': 'dockerfile',
    '.graphql': 'graphql',
    '.gql': 'graphql',
  }
  return map[ext] ?? 'plaintext'
}

/* ── Types ──────────────────────────────────────────────────────────── */

interface OpenTab {
  path: string
  name: string
  content: string
  originalContent: string
  gitOriginalContent?: string | null
  isGit?: boolean
  language: string
  dirty: boolean
}

interface ProjectInfo {
  name: string
  path: string
  framework: string
  frameworkLabel: string
}

type PromptState =
  | { mode: 'new-file' | 'new-folder'; targetPath: string | null }
  | { type: 'rename'; targetPath: string; oldName: string }
  | { type: 'delete'; targetPath: string; entry: FileEntry }

const TERMINAL_HEIGHT = 240

/* ── EditorScreen ───────────────────────────────────────────────────── */

export function EditorScreen() {
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const [diffActionLoading, setDiffActionLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const chatSessionId = useWorkspaceStore((s) => s.editorSessionKey)
  const setChatSessionId = useWorkspaceStore((s) => s.setEditorSessionKey)
  const [terminalKey, setTerminalKey] = useState(0)

  const [isMobile, setIsMobile] = useState(false)

  useLayoutEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const activeWorkspacePath = useWorkspaceStore((s) => s.activeWorkspacePath)
  const setActiveWorkspacePath = useWorkspaceStore(
    (s) => s.setActiveWorkspacePath,
  )
  const selectedFolder = activeWorkspacePath || ''
  const setSelectedFolder = (path: string) =>
    setActiveWorkspacePath(path || null)

  const { sessions } = useChatSessions({
    activeFriendlyId: chatSessionId,
    isNewChat: false,
  })

  // Filter sessions specifically relevant to Code Editor / active workspace
  const { currentFolderSessions, allOtherCodeSessions } = useMemo(() => {
    const current: typeof sessions = []
    const other: typeof sessions = []

    const folderName = selectedFolder ? selectedFolder.split('/').filter(Boolean).pop() : ''

    for (const s of sessions) {
      if (s.key === 'main') continue
      const title = s.title || ''
      const isExplicitEditor =
        title.startsWith('[Workspace:') ||
        title.startsWith('Code:') ||
        s.key.startsWith('editor-')

      if (isExplicitEditor) {
        if (!folderName) {
          current.push(s)
        } else if (title.includes(folderName)) {
          current.push(s)
        } else {
          other.push(s)
        }
      }
    }

    return { currentFolderSessions: current, allOtherCodeSessions: other }
  }, [sessions, selectedFolder])

  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<any[]>([])
  const viewZonesRef = useRef<string[]>([])

  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderSearchQuery, setFolderSearchQuery] = useState('')
  const favoriteProjectPaths = useWorkspaceStore(
    (s) => s.favoriteProjectPaths,
  )
  const toggleFavoriteProject = useWorkspaceStore(
    (s) => s.toggleFavoriteProject,
  )
  const [fileTreeVersion, setFileTreeVersion] = useState(0)
  const [editorVersion, setEditorVersion] = useState(0)
  const [changedFiles, setChangedFiles] = useState<Array<{ path: string; status: string; staged: boolean }>>([])
  const [gitStatusFiles, setGitStatusFiles] = useState<Array<{ path: string; status: string; staged: boolean }>>([])
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [loadingChanges, setLoadingChanges] = useState(false)

  // New File/Folder
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [clipboard, setClipboard] = useState<{
    type: 'copy' | 'cut'
    entry: FileEntry
  } | null>(null)

  const activeFile = tabs.find((t) => t.path === activeTab) ?? null

  /* ── Fetch Changed Files List (Git Status + Unsaved Dirty Files) ────── */
  const fetchChangedFiles = useCallback(async () => {
    setLoadingChanges(true)
    try {
      const folderParam = selectedFolder ? `&path=${encodeURIComponent(selectedFolder)}` : ''
      const res = await fetch(`/api/file-diff?action=changed-files${folderParam}`)
      let allFiles: Array<{ path: string; status: string; staged: boolean }> = []
      let gitFiles: Array<{ path: string; status: string; staged: boolean }> = []
      if (res.ok) {
        const data = await res.json()
        if (data.ok) {
          allFiles = Array.isArray(data.files) ? data.files : []
          gitFiles = Array.isArray(data.gitFiles) ? data.gitFiles : []
          setIsGitRepo(Boolean(data.isGit))
          setGitStatusFiles(gitFiles)
        }
      }

      // Merge with unsaved dirty tabs in memory
      for (const tab of tabs) {
        if (tab.dirty && !allFiles.some((f) => f.path === tab.path)) {
          allFiles.push({
            path: tab.path,
            status: 'M',
            staged: false,
          })
        }
      }

      setChangedFiles(allFiles)
    } catch {
      // silently fallback
    } finally {
      setLoadingChanges(false)
    }
  }, [selectedFolder, tabs])

  /* ── Auto-poll Disk & Git changes every 2 seconds ─────────────────── */
  useEffect(() => {
    const timer = setInterval(() => {
      void fetchChangedFiles()

      // Also background poll active tab disk/git status if not modified locally
      if (activeFile && !activeFile.dirty) {
        void (async () => {
          try {
            const res = await fetch(
              `/api/file-diff?path=${encodeURIComponent(activeFile.path)}`,
            )
            if (!res.ok) return
            const data = await res.json()
            if (data.ok) {
              const diskContent = data.currentContent ?? ''
              const original = data.originalContent !== null && data.originalContent !== undefined
                ? data.originalContent
                : activeFile.originalContent

              if (diskContent !== activeFile.content || Boolean(data.isGit) !== activeFile.isGit || original !== activeFile.gitOriginalContent) {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.path === activeFile.path
                      ? {
                          ...t,
                          content: diskContent,
                          isGit: Boolean(data.isGit),
                          gitOriginalContent: original,
                          originalContent: t.originalContent || diskContent,
                        }
                      : t,
                  ),
                )
                setEditorVersion((v) => v + 1)
              }
            }
          } catch {
            // ignore
          }
        })()
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [fetchChangedFiles, activeFile])

  /* ── Auto-fetch diff & Auto-enable Diff Mode when opening file ─────── */
  useEffect(() => {
    if (!activeFile) return
    let active = true

    void (async () => {
      try {
        const res = await fetch(
          `/api/file-diff?path=${encodeURIComponent(activeFile.path)}`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.ok && active) {
          const original = data.originalContent !== null && data.originalContent !== undefined
            ? data.originalContent
            : activeFile.originalContent
          const hasDiffChanges = original !== null && original !== undefined && original !== activeFile.content

          setTabs((prev) =>
            prev.map((t) =>
              t.path === activeFile.path
                ? {
                    ...t,
                    isGit: Boolean(data.isGit),
                    gitOriginalContent: original,
                  }
                : t,
            ),
          )

          // Auto-enable diff highlight if changes exist
          if (hasDiffChanges) {
            setDiffMode(true)
          }
        }
      } catch {
        // silently fallback
      }
    })()

    return () => {
      active = false
    }
  }, [activeFile?.path, selectedFolder])

  // Watch for active file content edits (e.g. user typing in editor or dirty changes)
  useEffect(() => {
    if (!activeFile) return
    const original = activeFile.gitOriginalContent ?? activeFile.originalContent
    if (original !== null && original !== undefined && original !== activeFile.content) {
      setDiffMode(true)
    }
  }, [activeFile?.content, activeFile?.dirty])

  /* ── Stabilo Diff Highlight + Deleted ViewZones (Antigravity Style) ── */
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    // Clean up previous viewZones
    editor.changeViewZones((changeAccessor: any) => {
      for (const zoneId of viewZonesRef.current) {
        changeAccessor.removeZone(zoneId)
      }
      viewZonesRef.current = []
    })

    if (!diffMode || !activeFile) {
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      }
      return
    }

    const original = activeFile.gitOriginalContent ?? activeFile.originalContent ?? ''
    const current = activeFile.content ?? ''

    // Compute line diff
    const diffs = Diff.diffLines(original, current)
    const newDecorations: any[] = []
    const pendingZones: Array<{ afterLineNumber: number; heightInLines: number; domNode: HTMLElement }> = []

    let currentLine = 1
    for (const part of diffs) {
      const lineCount = part.count || 1
      if (part.added) {
        newDecorations.push({
          range: new monaco.Range(
            currentLine,
            1,
            currentLine + lineCount - 1,
            1,
          ),
          options: {
            isWholeLine: true,
            className: 'diff-line-added',
            inlineClassName: 'diff-inline-added',
            linesDecorationsClassName: 'diff-gutter-added',
            overviewRuler: {
              color: '#22c55e',
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        })
        currentLine += lineCount
      } else if (part.removed) {
        // Render Phantom Deleted Code Block (Antigravity / Cursor ViewZone)
        const deletedLines = part.value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || _ !== '')
        const zoneHeight = Math.max(1, deletedLines.length)
        const targetLine = Math.max(0, currentLine - 1)

        const container = document.createElement('div')
        container.className = 'diff-deleted-viewzone'
        deletedLines.forEach((textLine) => {
          const lineDiv = document.createElement('div')
          lineDiv.className = 'diff-deleted-viewzone-line'
          const prefix = document.createElement('span')
          prefix.className = 'diff-deleted-viewzone-prefix'
          prefix.textContent = '-'
          const textSpan = document.createElement('span')
          textSpan.textContent = textLine
          lineDiv.appendChild(prefix)
          lineDiv.appendChild(textSpan)
          container.appendChild(lineDiv)
        })

        pendingZones.push({
          afterLineNumber: targetLine,
          heightInLines: zoneHeight,
          domNode: container,
        })
      } else {
        currentLine += lineCount
      }
    }

    // Apply decorations directly to editor
    try {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    } catch {
      // ignore
    }

    // Apply viewzones to editor
    if (pendingZones.length > 0) {
      editor.changeViewZones((changeAccessor: any) => {
        for (const zone of pendingZones) {
          const id = changeAccessor.addZone({
            afterLineNumber: zone.afterLineNumber,
            heightInLines: zone.heightInLines,
            domNode: zone.domNode,
            suppressMouseDown: false,
          })
          viewZonesRef.current.push(id)
        }
      })
    }
  }, [diffMode, editorVersion, activeFile?.path, activeFile?.content, activeFile?.gitOriginalContent, activeFile?.originalContent])
  const setActiveEditorFile = useWorkspaceStore((s) => s.setActiveEditorFile)

  useEffect(() => {
    setActiveEditorFile(activeFile?.path ?? null)
    return () => setActiveEditorFile(null) // clear on unmount
  }, [activeFile?.path, setActiveEditorFile])

  /* ── Fetch projects for folder selector ──────────────────────────── */

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/projects')
        if (!res.ok) return
        const data = (await res.json()) as { projects?: ProjectInfo[] }
        setProjects(data.projects ?? [])
      } catch {
        // silently fail
      }
    })()
  }, [])

  /* ── Open a file ─────────────────────────────────────────────────── */

  const openFile = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === 'folder') return

      // Already open? Just switch to it
      const existing = tabs.find((t) => t.path === entry.path)
      if (existing) {
        setActiveTab(existing.path)
        return
      }

      setLoadingFile(true)
      try {
        const res = await fetch(
          `/api/files?action=read&mode=browse&path=${encodeURIComponent(entry.path)}`,
        )
        if (!res.ok) {
          // Fallback without mode=browse
          const fallbackRes = await fetch(
            `/api/files?action=read&path=${encodeURIComponent(entry.path)}`,
          )
          if (!fallbackRes.ok) throw new Error(`HTTP ${res.status}`)
        }
        const data = (await (res.ok ? res : await fetch(`/api/files?action=read&path=${encodeURIComponent(entry.path)}`)).json()) as {
          type?: string
          content?: string
        }

        if (data.type === 'image') {
          toast('Cannot edit image files in Code Editor.', { type: 'warning' })
          return
        }

        const content = data.content ?? ''
        const language = extToLanguage(entry.name)

        // Fetch diff original baseline content in background
        let gitOriginalContent: string | null = null
        let isGit = false
        try {
          const diffRes = await fetch(
            `/api/file-diff?path=${encodeURIComponent(entry.path)}`,
          )
          if (diffRes.ok) {
            const diffData = await diffRes.json()
            if (diffData.ok) {
              isGit = Boolean(diffData.isGit)
              gitOriginalContent = diffData.originalContent
            }
          }
        } catch {
          // silently fallback
        }

        const baseline = gitOriginalContent !== null && gitOriginalContent !== undefined
          ? gitOriginalContent
          : content

        const hasDiff = baseline !== content

        const newTab: OpenTab = {
          path: entry.path,
          name: entry.name,
          content,
          originalContent: baseline,
          gitOriginalContent,
          isGit,
          language,
          dirty: hasDiff,
        }

        setTabs((prev) => [...prev, newTab])
        setActiveTab(entry.path)
        if (hasDiff) {
          setDiffMode(true)
        }
      } catch (err: any) {
        toast(`Failed to open file: ${err?.message ?? 'Unknown error'}`, {
          type: 'error',
        })
      } finally {
        setLoadingFile(false)
      }
    },
    [tabs],
  )

  /* ── Context Menu Actions ─────────────────────────────────────────── */

  const handleCopy = useCallback((entry: FileEntry) => {
    setClipboard({ type: 'copy', entry })
    toast(`Copied ${entry.name}`, { type: 'success' })
  }, [])

  const handleCut = useCallback((entry: FileEntry) => {
    setClipboard({ type: 'cut', entry })
    toast(`Cut ${entry.name}`, { type: 'success' })
  }, [])

  const handlePaste = useCallback(
    async (targetFolder: FileEntry | null) => {
      if (!clipboard) return
      const folderPath = targetFolder
        ? targetFolder.type === 'folder'
          ? targetFolder.path
          : targetFolder.path.split('/').slice(0, -1).join('/')
        : selectedFolder || ''
      const destPath = `${folderPath ? folderPath + '/' : ''}${clipboard.entry.name}`

      if (destPath === clipboard.entry.path) {
        toast('Cannot paste into the same location', { type: 'warning' })
        return
      }

      try {
        if (clipboard.type === 'cut') {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'rename',
              from: clipboard.entry.path,
              to: destPath,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          setTabs((prev) =>
            prev.map((t) =>
              t.path === clipboard.entry.path
                ? { ...t, path: destPath, name: clipboard.entry.name }
                : t,
            ),
          )
          if (activeTab === clipboard.entry.path) setActiveTab(destPath)
          setClipboard(null) // clear clipboard after cut
        } else {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'copy',
              from: clipboard.entry.path,
              to: destPath,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
        }
        toast(`Pasted ${clipboard.entry.name}`, { type: 'success' })
        setFileTreeVersion((v) => v + 1)
      } catch (err: any) {
        toast(`Failed to paste: ${err?.message ?? 'Unknown error'}`, {
          type: 'error',
        })
      }
    },
    [clipboard, selectedFolder, activeTab],
  )

  const handleRename = useCallback((entry: FileEntry) => {
    setPromptState({
      type: 'rename',
      targetPath: entry.path,
      oldName: entry.name,
    })
    setPromptValue(entry.name)
  }, [])

  /* ── Delete ───────────────────────────────────────────────────────── */

  const handleDeleteFile = useCallback((entry: FileEntry) => {
    setPromptState({ type: 'delete', targetPath: entry.path, entry })
  }, [])

  /* ── Save ─────────────────────────────────────────────────────────── */

  /* ── Accept / Decline Diff Changes ─────────────────────────────── */

  const handleAcceptDiff = useCallback(async () => {
    if (!activeFile) return
    setDiffActionLoading(true)
    try {
      // 1. Fetch current disk content
      const diskRes = await fetch(
        `/api/files?action=read&path=${encodeURIComponent(activeFile.path)}`,
      )
      let diskContent = activeFile.content
      if (diskRes.ok) {
        const diskData = await diskRes.json()
        if (typeof diskData.content === 'string') {
          diskContent = diskData.content
        }
      }

      const res = await fetch('/api/file-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          path: activeFile.path,
          modifiedContent: diskContent,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeFile.path
            ? {
                ...t,
                content: diskContent,
                dirty: false,
                originalContent: diskContent,
                gitOriginalContent: diskContent,
              }
            : t,
        ),
      )
      setDiffMode(false)
      setEditorVersion((v) => v + 1)
      toast(`Accepted changes for ${activeFile.name}`, { type: 'success' })
      void fetchChangedFiles()
    } catch (err: any) {
      toast(`Accept failed: ${err?.message ?? 'Unknown error'}`, {
        type: 'error',
      })
    } finally {
      setDiffActionLoading(false)
    }
  }, [activeFile, fetchChangedFiles])

  const handleAcceptAllChanges = useCallback(async () => {
    if (changedFiles.length === 0) return
    setDiffActionLoading(true)
    try {
      const res = await fetch('/api/file-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept-all',
          path: selectedFolder || '/',
          files: changedFiles,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Reset all tabs dirty states & baselines
      setTabs((prev) =>
        prev.map((t) => ({
          ...t,
          dirty: false,
          originalContent: t.content,
          gitOriginalContent: t.content,
        })),
      )
      setDiffMode(false)
      setEditorVersion((v) => v + 1)
      toast(`Accepted all ${changedFiles.length} changed files`, {
        type: 'success',
      })
      void fetchChangedFiles()
    } catch (err: any) {
      toast(`Accept all failed: ${err?.message ?? 'Unknown error'}`, {
        type: 'error',
      })
    } finally {
      setDiffActionLoading(false)
    }
  }, [changedFiles, selectedFolder, fetchChangedFiles])

  const handleDeclineAllChanges = useCallback(async () => {
    if (changedFiles.length === 0) return
    setDiffActionLoading(true)
    try {
      const res = await fetch('/api/file-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline-all',
          path: selectedFolder || '/',
          files: changedFiles,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Reload active file content if affected
      if (activeFile) {
        const diskRes = await fetch(
          `/api/files?action=read&path=${encodeURIComponent(activeFile.path)}`,
        )
        if (diskRes.ok) {
          const diskData = await diskRes.json()
          if (typeof diskData.content === 'string') {
            setTabs((prev) =>
              prev.map((t) =>
                t.path === activeFile.path
                  ? {
                      ...t,
                      content: diskData.content,
                      dirty: false,
                      originalContent: diskData.content,
                      gitOriginalContent: diskData.content,
                    }
                  : t,
              ),
            )
          }
        }
      }

      setDiffMode(false)
      setEditorVersion((v) => v + 1)
      toast(`Reverted all ${changedFiles.length} files`, { type: 'info' })
      void fetchChangedFiles()
    } catch (err: any) {
      toast(`Decline all failed: ${err?.message ?? 'Unknown error'}`, {
        type: 'error',
      })
    } finally {
      setDiffActionLoading(false)
    }
  }, [changedFiles, selectedFolder, activeFile, fetchChangedFiles])

  const handleDeclineDiff = useCallback(async () => {
    if (!activeFile) return
    const original = activeFile.gitOriginalContent ?? activeFile.originalContent
    setDiffActionLoading(true)
    try {
      const res = await fetch('/api/file-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          path: activeFile.path,
          originalContent: original,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeFile.path
            ? {
                ...t,
                content: original,
                dirty: false,
              }
            : t,
        ),
      )
      setDiffMode(false)
      toast(`Reverted changes for ${activeFile.name}`, { type: 'info' })
      void fetchChangedFiles()
    } catch (err: any) {
      toast(`Decline failed: ${err?.message ?? 'Unknown error'}`, {
        type: 'error',
      })
    } finally {
      setDiffActionLoading(false)
    }
  }, [activeFile, fetchChangedFiles])

  const saveFile = useCallback(async () => {
    if (!activeFile || !activeFile.dirty) return

    setSaving(true)
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          path: activeFile.path,
          content: activeFile.content,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeFile.path
            ? { ...t, dirty: false, originalContent: t.content }
            : t,
        ),
      )
      toast(`Saved ${activeFile.name}`, { type: 'success' })
    } catch (err: any) {
      toast(`Save failed: ${err?.message ?? 'Unknown error'}`, {
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [activeFile])

  /* ── Create File/Folder ───────────────────────────────────────────── */

  const handlePromptSubmit = useCallback(async () => {
    if (!promptState) return

    try {
      if ('type' in promptState && promptState.type === 'delete') {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            path: promptState.entry.path,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast(`Deleted ${promptState.entry.name}`, { type: 'success' })

        setFileTreeVersion((v) => v + 1)
        setTabs((prev) => {
          const newTabs = prev.filter(
            (t) => !t.path.startsWith(promptState.entry.path),
          )
          return newTabs
        })
        setActiveTab((current) => {
          if (current?.startsWith(promptState.entry.path)) return null
          return current
        })
        setPromptState(null)
        setPromptValue('')
        return
      }

      const value = promptValue.trim()
      if (!value) return

      if ('type' in promptState && promptState.type === 'rename') {
        const dir = promptState.targetPath.split('/').slice(0, -1).join('/')
        const nextPath = dir ? `${dir}/${value}` : value

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'rename',
            from: promptState.targetPath,
            to: nextPath,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        // Update active tab if we renamed the currently opened file
        setTabs((prev) =>
          prev.map((t) =>
            t.path === promptState.targetPath
              ? { ...t, path: nextPath, name: value }
              : t,
          ),
        )
        if (activeTab === promptState.targetPath) setActiveTab(nextPath)
      } else {
        const nextPath = promptState.targetPath
          ? `${promptState.targetPath}/${value}`
          : value

        if ('mode' in promptState && promptState.mode === 'new-folder') {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'mkdir', path: nextPath }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } else {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'write',
              path: nextPath,
              content: '',
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          setTabs((prev) => [
            ...prev,
            {
              path: nextPath,
              name: value,
              content: '',
              originalContent: '',
              language: extToLanguage(value),
              dirty: false,
            },
          ])
          setActiveTab(nextPath)
        }
      }

      setPromptState(null)
      setPromptValue('')
      setFileTreeVersion((v) => v + 1)
    } catch (err: any) {
      toast(`Failed: ${err?.message ?? 'Unknown error'}`, { type: 'error' })
    }
  }, [promptState, promptValue, activeTab])

  /* ── Close tab ────────────────────────────────────────────────────── */

  const closeTab = useCallback(
    (path: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setTabs((prev) => {
        const next = prev.filter((t) => t.path !== path)
        if (activeTab === path) {
          setActiveTab(next.length > 0 ? next[next.length - 1].path : null)
        }
        return next
      })
    },
    [activeTab],
  )

  /* ── Content change handler ───────────────────────────────────────── */

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (!activeTab || value == null) return
      setTabs((prev) =>
        prev.map((t) => {
          if (t.path !== activeTab) return t
          const baseline = t.gitOriginalContent ?? t.originalContent
          const isDirty = value !== baseline
          return {
            ...t,
            content: value,
            dirty: isDirty,
          }
        }),
      )
      setEditorVersion((v) => v + 1)
    },
    [activeTab],
  )

  /* ── Keyboard shortcuts (Ctrl+S save, Ctrl+` terminal) ──────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void saveFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggleTerminal()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveFile])

  /* ── Monaco onMount ───────────────────────────────────────────────── */

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    // Trigger decoration calculation immediately after mounting
    setEditorVersion((v) => v + 1)
  }

  /* ── Select folder ────────────────────────────────────────────────── */

  const handleSelectFolder = (path: string) => {
    // 1. Clear Monaco decorations & phantom zones
    if (editorRef.current) {
      try {
        for (const zoneId of viewZonesRef.current) {
          editorRef.current.changeViewZones((changeAccessor: any) => {
            changeAccessor.removeZone(zoneId)
          })
        }
      } catch {}
      viewZonesRef.current = []
      if (decorationsRef.current.length > 0) {
        editorRef.current.deltaDecorations(decorationsRef.current, [])
        decorationsRef.current = []
      }
    }

    // 2. Clear open tabs & state from previous workspace
    setTabs([])
    setActiveTab(null)
    setDiffMode(false)
    setChangedFiles([])
    setGitStatusFiles([])

    // 3. Set new active workspace
    setSelectedFolder(path)
    setFolderModalOpen(false)

    // 4. Reset terminal to new cwd
    if (terminalOpen) {
      setTerminalKey((k) => k + 1)
    }
  }

  /* ── Toggle terminal ──────────────────────────────────────────────── */

  const toggleTerminal = () => {
    setTerminalOpen((prev) => !prev)
    if (!terminalOpen) {
      setTerminalKey((k) => k + 1)
    }
  }

  /* ── Selected folder label ────────────────────────────────────────── */

  const selectedProject = projects.find((p) => p.path === selectedFolder)
  const folderLabel = selectedProject?.name ?? 'Root Workspace'

  /* ── Terminal cwd ─────────────────────────────────────────────────── */

  const terminalCwd = selectedFolder || '~'

  /* ── Render ───────────────────────────────────────────────────────── */

  const sidebarElement = (
    <div
      className={cn(
        'flex h-full w-full flex-col border-r',
        isMobile ? 'absolute inset-0 z-40' : '',
      )}
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-card)',
      }}
    >
      {/* Sidebar header */}
      <div
        className="flex h-10 shrink-0 items-center justify-between border-b px-3"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--theme-muted)' }}
        >
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFileTreeVersion((v) => v + 1)}
            className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)]"
            title="Refresh"
          >
            <HugeiconsIcon
              icon={ReloadIcon}
              size={14}
              style={{ color: 'var(--theme-muted)' }}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptState({ mode: 'new-file', targetPath: selectedFolder })
              setPromptValue('')
            }}
            className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)]"
            title="New File"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              size={14}
              style={{ color: 'var(--theme-muted)' }}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptState({ mode: 'new-folder', targetPath: selectedFolder })
              setPromptValue('')
            }}
            className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)]"
            title="New Folder"
          >
            <HugeiconsIcon
              icon={Folder01Icon}
              size={14}
              style={{ color: 'var(--theme-muted)' }}
            />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)] ml-1"
            title="Close Sidebar"
          >
            <HugeiconsIcon
              icon={SidebarLeft01Icon}
              size={14}
              style={{ color: 'var(--theme-muted)' }}
            />
          </button>
        </div>
      </div>

      {/* ── Open Folder Button ───────────────────────────── */}
      <div
        className="border-b px-2 py-2"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--theme-card2)]"
          style={{
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          <HugeiconsIcon
            icon={Folder01Icon}
            size={14}
            style={{ color: 'var(--theme-warning, #f59e0b)' }}
          />
          <span>Open Folder</span>
        </button>
      </div>

      {/* Folder Selection Modal */}
      <DialogRoot open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent>
          <div className="p-5 flex flex-col max-h-[85vh] w-full max-w-lg">
            <DialogTitle className="mb-1">Open Folder</DialogTitle>
            <DialogDescription className="mb-3">
              Select a workspace or project folder to open in the editor.
            </DialogDescription>

            {/* Search project bar */}
            <div className="relative mb-3">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400"
              />
              <input
                type="text"
                value={folderSearchQuery}
                onChange={(e) => setFolderSearchQuery(e.target.value)}
                placeholder="Search projects by name or path..."
                className="w-full rounded-lg border bg-white/5 pl-9 pr-3 py-1.5 text-xs outline-none transition-colors focus:border-[var(--theme-accent)]"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
              {folderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFolderSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={12}
                    className="text-primary-400"
                  />
                </button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto rounded-lg border bg-primary-50/50 p-1 divide-y divide-primary-100"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              {/* Root workspace option (only if matching search) */}
              {(!folderSearchQuery || 'root workspace'.includes(folderSearchQuery.toLowerCase())) && (
                <button
                  type="button"
                  onClick={() => handleSelectFolder('')}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-100',
                    selectedFolder === '' && 'bg-primary-100/80 font-medium',
                  )}
                  style={{
                    color:
                      selectedFolder === ''
                        ? 'var(--theme-accent)'
                        : 'var(--theme-text)',
                  }}
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={16}
                    style={{ color: 'var(--theme-warning, #f59e0b)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs">Root Workspace</div>
                    <div className="font-mono text-[10px] text-primary-500">
                      /home/ahlfs/workspace
                    </div>
                  </div>
                </button>
              )}

              {/* Projects (sorted with Favorites first, then alphabetized) */}
              {projects
                .filter((project) => {
                  if (!folderSearchQuery.trim()) return true
                  const q = folderSearchQuery.toLowerCase()
                  return (
                    project.name.toLowerCase().includes(q) ||
                    project.path.toLowerCase().includes(q) ||
                    project.frameworkLabel.toLowerCase().includes(q)
                  )
                })
                .sort((a, b) => {
                  const aFav = favoriteProjectPaths.includes(a.path) ? 1 : 0
                  const bFav = favoriteProjectPaths.includes(b.path) ? 1 : 0
                  if (aFav !== bFav) return bFav - aFav
                  return a.name.localeCompare(b.name)
                })
                .map((project) => {
                  const isFav = favoriteProjectPaths.includes(project.path)
                  return (
                    <div
                      key={project.path}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-primary-100/80 group',
                        selectedFolder === project.path && 'bg-primary-100 font-medium',
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavoriteProject(project.path)
                        }}
                        className="p-1 rounded text-primary-400 hover:text-amber-400 transition-colors"
                        title={isFav ? 'Remove from favorites' : 'Mark as favorite'}
                      >
                        <HugeiconsIcon
                          icon={StarIcon}
                          size={14}
                          className={cn(isFav ? 'text-amber-400 fill-amber-400' : 'text-primary-300')}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectFolder(project.path)}
                        className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                        style={{
                          color:
                            selectedFolder === project.path
                              ? 'var(--theme-accent)'
                              : 'var(--theme-text)',
                        }}
                      >
                        <HugeiconsIcon
                          icon={Folder01Icon}
                          size={16}
                          style={{ color: 'var(--theme-warning, #f59e0b)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold">{project.name}</div>
                          <div className="truncate font-mono text-[10px] text-primary-500">
                            {project.path}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md border border-primary-200 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-500">
                          {project.frameworkLabel}
                        </span>
                      </button>
                    </div>
                  )
                })}

              {projects.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-primary-500">
                  No projects detected.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </DialogRoot>

      {/* Changed Files (Antigravity Review Panel) */}
      {changedFiles.length > 0 && (
        <div
          className="border-b px-2 py-2 flex flex-col gap-1.5 shrink-0 max-h-56 overflow-y-auto"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card2)' }}
        >
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="flex size-2 rounded-full bg-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text)]">
                Changes ({changedFiles.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {loadingChanges && (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={12}
                  className="animate-spin text-[var(--theme-muted)]"
                />
              )}
              <button
                type="button"
                onClick={() => void handleDeclineAllChanges()}
                disabled={diffActionLoading}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                title="Decline and revert all changes"
              >
                Revert All
              </button>
              <button
                type="button"
                onClick={() => void handleAcceptAllChanges()}
                disabled={diffActionLoading}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                title="Accept all changes"
              >
                Accept All
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            {changedFiles.map((file) => {
              const fileName = file.path.split('/').pop() || file.path
              const isActive = activeTab === file.path
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() =>
                    openFile({
                      name: fileName,
                      path: file.path,
                      type: 'file',
                    })
                  }
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-left text-xs font-mono transition-colors',
                    isActive
                      ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] font-semibold'
                      : 'text-[var(--theme-text)] hover:bg-[var(--theme-card)]',
                  )}
                  title={file.path}
                >
                  <span className="truncate max-w-[170px]">{fileName}</span>
                  <span
                    className={cn(
                      'ml-1 shrink-0 rounded px-1 text-[10px] font-bold',
                      file.status.includes('M')
                        ? 'bg-amber-500/20 text-amber-400'
                        : file.status.includes('A') || file.status.includes('?')
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400',
                    )}
                  >
                    {file.status}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        <FileTree
          selectedPath={activeTab}
          onSelect={openFile}
          rootPath={selectedFolder || undefined}
          refreshVersion={fileTreeVersion}
          onDelete={handleDeleteFile}
          clipboard={clipboard}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onRename={handleRename}
          changedFiles={isGitRepo ? gitStatusFiles : []}
        />
      </div>
    </div>
  )

  const editorElement = (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Tab bar */}
        <div
          className="flex h-10 shrink-0 items-center gap-0 border-b overflow-x-auto"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'var(--theme-card)',
          }}
        >
          {/* Sidebar toggle (when collapsed) */}
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-full items-center px-3 transition-colors hover:bg-[var(--theme-card2)]"
            >
              <HugeiconsIcon
                icon={Menu01Icon}
                size={16}
                style={{ color: 'var(--theme-muted)' }}
              />
            </button>
          )}

          {/* Tabs */}
          {tabs.map((tab) => (
            <button
              key={tab.path}
              type="button"
              onClick={() => setActiveTab(tab.path)}
              className={cn(
                'group flex h-full items-center gap-2 border-r px-3 text-[12px] font-medium transition-colors',
                tab.path === activeTab
                  ? 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
                  : 'text-[var(--theme-muted)] hover:bg-[var(--theme-card2)]',
              )}
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <HugeiconsIcon
                icon={File01Icon}
                size={13}
                className="shrink-0 opacity-60"
              />
              <span className="max-w-[120px] truncate">{tab.name}</span>
              {tab.dirty && (
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ background: 'var(--theme-accent, #60a5fa)' }}
                />
              )}
              <span
                onClick={(e) => closeTab(tab.path, e)}
                className="ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--theme-card2)] group-hover:opacity-80"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </span>
            </button>
          ))}

          {/* Spacer + actions */}
          <div className="flex-1" />

          {/* Save button */}
          {activeFile?.dirty && (
            <button
              type="button"
              onClick={() => void saveFile()}
              disabled={saving}
              className="mr-2 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'var(--theme-card)',
                color: 'var(--theme-ink)',
              }}
            >
              <HugeiconsIcon icon={FloppyDiskIcon} size={14} />
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
        </div>

        {/* ── Editor + Terminal split ─────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Diff Action Toolbar banner */}
          {diffMode && activeFile && (
            <div
              className="flex items-center justify-between border-b px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'var(--theme-card)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-semibold text-amber-400">Inline Diff View:</span>
                <span className="text-[var(--theme-muted)]">
                  {activeFile.isGit ? 'Comparing with Git HEAD' : 'Comparing with initial baseline'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeclineDiff()}
                  disabled={diffActionLoading}
                  className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  title="Revert modified changes back to original baseline"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={13} />
                  <span>Decline / Revert</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleAcceptDiff()}
                  disabled={diffActionLoading}
                  className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  title="Accept and save modified changes to file"
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                  <span>Accept Changes</span>
                </button>
              </div>
            </div>
          )}

          {/* Editor area */}
          <div className="relative flex-1 min-h-0">
            {loadingFile && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--theme-bg)]/80 backdrop-blur-sm">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={24}
                  className="animate-spin text-[var(--theme-accent)]"
                />
              </div>
            )}

            {activeFile ? (
              <Editor
                key={activeFile.path}
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                theme="vs-dark"
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 14,
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
                  fontLigatures: true,
                  minimap: { enabled: true, side: 'right' },
                  scrollBeyondLastLine: false,
                  wordWrap: 'off',
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  tabSize: 2,
                  padding: { top: 12 },
                  automaticLayout: true,
                }}
              />
            ) : (
              /* Empty state (or Pending Changes Review Hero) */
              changedFiles.length > 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
                  <div
                    className="flex size-16 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: 'var(--theme-border)',
                      background: 'var(--theme-card2)',
                    }}
                  >
                    <span className="flex size-4 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <div className="max-w-md">
                    <h2
                      className="text-base font-bold flex items-center justify-center gap-2"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      <span>Pending AI Review</span>
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400 font-mono">
                        {changedFiles.length} {changedFiles.length === 1 ? 'file' : 'files'} modified
                      </span>
                    </h2>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--theme-muted)' }}
                    >
                      AI Agent has generated or modified files in this workspace. You can review and accept them individually from the sidebar, or review all changes here.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleDeclineAllChanges()}
                      disabled={diffActionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      <span>Decline All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAcceptAllChanges()}
                      disabled={diffActionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                      <span>Accept All Changes</span>
                    </button>
                  </div>

                  <div
                    className="mt-2 w-full max-w-sm rounded-lg border p-2 text-left divide-y divide-[var(--theme-border)] max-h-48 overflow-y-auto"
                    style={{
                      borderColor: 'var(--theme-border)',
                      background: 'var(--theme-card)',
                    }}
                  >
                    {changedFiles.map((f) => {
                      const fName = f.path.split('/').pop() || f.path
                      return (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() =>
                            openFile({
                              name: fName,
                              path: f.path,
                              type: 'file',
                            })
                          }
                          className="flex w-full items-center justify-between py-1.5 px-2 text-xs font-mono hover:bg-[var(--theme-card2)] rounded transition-colors"
                        >
                          <span className="truncate text-[var(--theme-text)]">{fName}</span>
                          <span
                            className={cn(
                              'ml-2 rounded px-1 text-[10px] font-bold shrink-0',
                              f.status === 'M' && 'bg-amber-500/20 text-amber-400',
                              f.status === 'U' && 'bg-emerald-500/20 text-emerald-400',
                              f.status === 'D' && 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {f.status}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div
                    className="flex size-20 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: 'var(--theme-border)',
                      background: 'var(--theme-card)',
                    }}
                  >
                    <i className="devicon-vscode-plain colored text-4xl opacity-60" />
                  </div>
                  <div className="text-center">
                    <h2
                      className="text-lg font-bold"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      LAM Code Editor
                    </h2>
                    <p
                      className="mt-1 max-w-xs text-sm"
                      style={{ color: 'var(--theme-muted)' }}
                    >
                      Select a file from the Explorer to start editing.
                      <br />
                      <span className="text-xs opacity-70">
                        Press{' '}
                        <kbd className="rounded bg-[var(--theme-card2)] px-1.5 py-0.5 font-mono text-[10px]">
                          Ctrl+S
                        </kbd>{' '}
                        to save
                        {' · '}
                        <kbd className="rounded bg-[var(--theme-card2)] px-1.5 py-0.5 font-mono text-[10px]">
                          Ctrl+`
                        </kbd>{' '}
                        to toggle terminal
                      </span>
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Terminal panel ──────────────────────────────────────── */}
          {terminalOpen && (
            <div
              className="shrink-0 border-t"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              {/* Terminal header */}
              <div
                className="flex h-8 items-center justify-between border-b px-3"
                style={{
                  borderColor: 'var(--theme-border)',
                  background: 'var(--theme-card)',
                }}
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={ComputerTerminal01Icon}
                    size={13}
                    style={{ color: 'var(--theme-muted)' }}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    Terminal
                  </span>
                  <span
                    className="rounded bg-[var(--theme-card2)] px-1.5 py-0.5 font-mono text-[9px]"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    {terminalCwd}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTerminalOpen(false)}
                  className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)]"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={13}
                    style={{ color: 'var(--theme-muted)' }}
                  />
                </button>
              </div>

              <Suspense
                fallback={
                  <div
                    className="flex items-center justify-center"
                    style={{ height: TERMINAL_HEIGHT, background: '#0b0f1a' }}
                  >
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={20}
                      className="animate-spin text-[var(--theme-muted)]"
                    />
                  </div>
                }
              >
                <EditorTerminal
                  key={terminalKey}
                  cwd={terminalCwd}
                  height={TERMINAL_HEIGHT}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* New File/Folder Dialog */}
      <DialogRoot
        open={Boolean(promptState)}
        onOpenChange={(open) => {
          if (!open) setPromptState(null)
        }}
      >
        <DialogContent>
          <div className="p-5 space-y-3">
            <DialogTitle>
              {promptState &&
              'type' in promptState &&
              promptState.type === 'delete'
                ? 'Confirm Delete'
                : promptState &&
                    'type' in promptState &&
                    promptState.type === 'rename'
                  ? 'Rename'
                  : promptState &&
                      'mode' in promptState &&
                      promptState.mode === 'new-folder'
                    ? 'New Folder'
                    : 'New File'}
            </DialogTitle>
            <DialogDescription>
              {promptState &&
              'type' in promptState &&
              promptState.type === 'delete' ? (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-mono bg-primary-100 px-1 py-0.5 rounded text-xs text-primary-800">
                    {promptState.entry.name}
                  </span>
                  ? This action cannot be undone.
                </>
              ) : promptState &&
                'type' in promptState &&
                promptState.type === 'rename' ? (
                <>
                  Enter a new name for{' '}
                  <span className="font-mono bg-primary-100 px-1 py-0.5 rounded text-xs text-primary-800">
                    {promptState.oldName}
                  </span>
                </>
              ) : (
                <>
                  Enter a name to create in{' '}
                  <span className="font-mono bg-primary-100 px-1 py-0.5 rounded text-xs text-primary-800">
                    {promptState?.targetPath || 'workspace root'}
                  </span>
                </>
              )}
            </DialogDescription>
            {(!promptState ||
              !('type' in promptState) ||
              promptState.type !== 'delete') && (
              <input
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handlePromptSubmit()
                }}
                className="w-full rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-300"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button
                onClick={handlePromptSubmit}
                variant={
                  promptState &&
                  'type' in promptState &&
                  promptState.type === 'delete'
                    ? 'destructive'
                    : 'default'
                }
              >
                {promptState &&
                'type' in promptState &&
                promptState.type === 'delete'
                  ? 'Delete'
                  : promptState &&
                      'type' in promptState &&
                      promptState.type === 'rename'
                    ? 'Rename'
                    : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>
    </>
  )

  const chatElement = (
    <div
      className={cn(
        'flex h-full w-full flex-col border-l',
        isMobile ? 'absolute inset-0 z-40' : '',
      )}
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-bg)',
      }}
    >
      {/* Agent Session Header */}
      <div
        className="flex h-10 shrink-0 items-center justify-between border-b px-3"
        style={{
          borderColor: 'var(--theme-border)',
          background: 'var(--theme-card)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="md:hidden flex items-center justify-center p-1 -ml-1 rounded hover:bg-white/10"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={14}
              style={{ color: 'var(--theme-muted)' }}
            />
          </button>
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--theme-muted)' }}
          >
            Code Agent
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setChatSessionId('new')}
            className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--theme-card2)]"
            style={{
              borderColor: 'var(--theme-border)',
              background: chatSessionId === 'new' ? 'var(--theme-accent)/20' : 'var(--theme-bg)',
              color: chatSessionId === 'new' ? 'var(--theme-accent, #60a5fa)' : 'var(--theme-text)',
            }}
            title="Start fresh isolated coding session"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={12} />
            <span>New Task</span>
          </button>
          <select
            value={chatSessionId}
            onChange={(e) => {
              if (e.target.value === '_new') {
                setChatSessionId('new')
              } else {
                setChatSessionId(e.target.value)
              }
            }}
            className="max-w-[170px] truncate rounded border px-2 py-1 text-[11px] outline-none transition-colors"
            style={{
              borderColor: 'var(--theme-border)',
              background: 'var(--theme-bg)',
              color: 'var(--theme-text)',
            }}
          >
            {chatSessionId === 'new' && <option value="new">New Task Session</option>}
            
            {/* Active Folder Tasks */}
            {currentFolderSessions.length > 0 && (
              <optgroup label="This Project">
                {currentFolderSessions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title || 'Untitled Task'}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Other Workspace Tasks (Fallback if folder renamed or looking across projects) */}
            {allOtherCodeSessions.length > 0 && (
              <optgroup label="Other Code Tasks">
                {allOtherCodeSessions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title || 'Untitled Task'}
                  </option>
                ))}
              </optgroup>
            )}

            {currentFolderSessions.length === 0 && allOtherCodeSessions.length === 0 && (
              <option disabled>No workspace tasks yet</option>
            )}
          </select>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              className="animate-spin text-[var(--theme-muted)]"
            />
          </div>
        }
      >
        <EditorChatScreen
          activeFriendlyId={chatSessionId}
          activeSessionKey={chatSessionId}
          onSessionResolved={({ sessionKey }) => {
            setChatSessionId(sessionKey)
          }}
          compact
          embedded
        />
      </Suspense>
    </div>
  )

  return (
    <div
      className="flex h-full w-full overflow-hidden relative"
      style={{ background: 'var(--theme-bg)' }}
    >
      {isMobile ? (
        <>
          {sidebarOpen && sidebarElement}
          {editorElement}
          {chatOpen && chatElement}
        </>
      ) : (
        <PanelGroup
          direction="horizontal"
          autoSaveId="editor-panels-layout-v4"
          className="flex h-full w-full"
        >
          {sidebarOpen && (
            <>
              <Panel id="sidebar" order={1} defaultSize={25} minSize={15}>
                {sidebarElement}
              </Panel>
              <PanelResizeHandle className="w-2 relative bg-transparent hover:bg-primary-300 active:bg-primary-400 transition-colors cursor-col-resize z-50 group">
                <div className="absolute inset-y-0 left-[3px] w-[1px] bg-border group-hover:bg-transparent" />
              </PanelResizeHandle>
            </>
          )}

          <Panel
            id="editor"
            order={2}
            defaultSize={sidebarOpen && chatOpen ? 40 : undefined}
          >
            {editorElement}
          </Panel>

          {chatOpen && (
            <>
              <PanelResizeHandle className="w-2 relative bg-transparent hover:bg-primary-300 active:bg-primary-400 transition-colors cursor-col-resize z-50 group">
                <div className="absolute inset-y-0 left-[3px] w-[1px] bg-border group-hover:bg-transparent" />
              </PanelResizeHandle>
              <Panel id="chat" order={3} defaultSize={35} minSize={15}>
                {chatElement}
              </Panel>
            </>
          )}
        </PanelGroup>
      )}
    </div>
  )
}
