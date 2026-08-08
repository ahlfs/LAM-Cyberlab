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
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Cancel01Icon,
  ComputerTerminal01Icon,
  File01Icon,
  FloppyDiskIcon,
  Folder01Icon,
  Loading03Icon,
  Menu01Icon,
  SidebarLeft01Icon,
  Message02Icon,
  PlusSignIcon,
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
  language: string
  dirty: boolean
}

interface ProjectInfo {
  name: string
  path: string
  framework: string
  frameworkLabel: string
}

type PromptState = {
  mode: 'new-file' | 'new-folder'
  targetPath: string
}

const TERMINAL_HEIGHT = 240

/* ── EditorScreen ───────────────────────────────────────────────────── */

export function EditorScreen() {
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const chatSessionId = useWorkspaceStore((s) => s.chatPanelSessionKey)
  const setChatSessionId = useWorkspaceStore((s) => s.setChatPanelSessionKey)
  const [terminalKey, setTerminalKey] = useState(0)

  const { sessions } = useChatSessions({ activeFriendlyId: chatSessionId, isNewChat: false })
  const editorRef = useRef<any>(null)

  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const activeWorkspacePath = useWorkspaceStore((s) => s.activeWorkspacePath)
  const setActiveWorkspacePath = useWorkspaceStore((s) => s.setActiveWorkspacePath)
  const selectedFolder = activeWorkspacePath || ''
  const setSelectedFolder = (path: string) => setActiveWorkspacePath(path || null)
  
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [fileTreeVersion, setFileTreeVersion] = useState(0)

  // New File/Folder
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [promptValue, setPromptValue] = useState('')

  const activeFile = tabs.find((t) => t.path === activeTab) ?? null

  /* ── Sync active file path to global store (breadcrumb injection) ── */
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
          `/api/files?action=read&path=${encodeURIComponent(entry.path)}`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as {
          type?: string
          content?: string
        }

        if (data.type === 'image') {
          toast('Cannot edit image files in Code Editor.', { type: 'warning' })
          return
        }

        const content = data.content ?? ''
        const language = extToLanguage(entry.name)

        const newTab: OpenTab = {
          path: entry.path,
          name: entry.name,
          content,
          originalContent: content,
          language,
          dirty: false,
        }

        setTabs((prev) => [...prev, newTab])
        setActiveTab(entry.path)
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

  /* ── Save ─────────────────────────────────────────────────────────── */

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
    const value = promptValue.trim()
    if (!value) return

    const nextPath = promptState.targetPath
      ? `${promptState.targetPath}/${value}`
      : value

    try {
      if (promptState.mode === 'new-folder') {
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
          body: JSON.stringify({ action: 'write', path: nextPath, content: '' }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Open the newly created file
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
      setPromptState(null)
      setPromptValue('')
      setFileTreeVersion((v) => v + 1)
    } catch (err: any) {
      toast(`Failed to create: ${err?.message ?? 'Unknown error'}`, { type: 'error' })
    }
  }, [promptState, promptValue])

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
        prev.map((t) =>
          t.path === activeTab
            ? {
                ...t,
                content: value,
                dirty: value !== t.originalContent,
              }
            : t,
        ),
      )
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

  const handleEditorMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor
    editor.focus()
  }

  /* ── Select folder ────────────────────────────────────────────────── */

  const handleSelectFolder = (path: string) => {
    setSelectedFolder(path)
    setFolderModalOpen(false)
    // Reset terminal to new cwd
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

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--theme-bg)' }}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col border-r transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden',
        )}
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
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
              onClick={() => {
                setPromptState({ mode: 'new-file', targetPath: selectedFolder })
                setPromptValue('')
              }}
              className="rounded p-0.5 transition-colors hover:bg-[var(--theme-card2)]"
              title="New File"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} style={{ color: 'var(--theme-muted)' }} />
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
              <HugeiconsIcon icon={Folder01Icon} size={14} style={{ color: 'var(--theme-muted)' }} />
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
        <div className="border-b px-2 py-2" style={{ borderColor: 'var(--theme-border)' }}>
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
        <DialogRoot
          open={folderModalOpen}
          onOpenChange={setFolderModalOpen}
        >
          <DialogContent>
            <div className="p-5 flex flex-col max-h-[80vh]">
              <DialogTitle className="mb-1">Open Folder</DialogTitle>
              <DialogDescription className="mb-4">
                Select a workspace or project folder to open in the editor.
              </DialogDescription>
              
              <div className="flex-1 overflow-y-auto rounded-lg border bg-primary-50/50 p-1" style={{ borderColor: 'var(--theme-border)' }}>
                {/* Root workspace option */}
                <button
                  type="button"
                  onClick={() => handleSelectFolder('')}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-100',
                    selectedFolder === '' && 'bg-primary-100/80 font-medium',
                  )}
                  style={{
                    color: selectedFolder === '' ? 'var(--theme-accent)' : 'var(--theme-text)',
                  }}
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={16}
                    style={{ color: 'var(--theme-warning, #f59e0b)' }}
                  />
                  Root Workspace
                </button>

                {/* Divider */}
                {projects.length > 0 && (
                  <div className="mx-2 my-1 border-t border-primary-200" />
                )}

                {/* Projects */}
                {projects.map((project) => (
                  <button
                    key={project.path}
                    type="button"
                    onClick={() => handleSelectFolder(project.path)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-100',
                      selectedFolder === project.path && 'bg-primary-100/80 font-medium',
                    )}
                    style={{
                      color: selectedFolder === project.path ? 'var(--theme-accent)' : 'var(--theme-text)',
                    }}
                  >
                    <HugeiconsIcon
                      icon={Folder01Icon}
                      size={16}
                      style={{ color: 'var(--theme-warning, #f59e0b)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{project.name}</div>
                      <div className="truncate font-mono text-[10px] text-primary-500">
                        {project.path}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-md border border-primary-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-primary-600"
                    >
                      {project.frameworkLabel}
                    </span>
                  </button>
                ))}

                {projects.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-primary-500">
                    No projects detected.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </DialogRoot>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto">
          <FileTree
            selectedPath={activeTab}
            onSelect={openFile}
            rootPath={selectedFolder || undefined}
            refreshVersion={fileTreeVersion}
          />
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
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

          {/* Chat toggle */}
          <button
            type="button"
            onClick={() => setChatOpen((p) => !p)}
            className={cn(
              'mr-1 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              chatOpen
                ? 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]'
                : 'text-[var(--theme-muted)] hover:bg-[var(--theme-card2)]',
            )}
            title={chatOpen ? 'Hide Agent' : 'Show Agent'}
          >
            <HugeiconsIcon icon={Message02Icon} size={14} />
            <span className="hidden sm:inline">Agent</span>
          </button>

          {/* Terminal toggle */}
          <button
            type="button"
            onClick={toggleTerminal}
            className={cn(
              'mr-1 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              terminalOpen
                ? 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]'
                : 'text-[var(--theme-muted)] hover:bg-[var(--theme-card2)]',
            )}
            title={terminalOpen ? 'Hide Terminal' : 'Show Terminal'}
          >
            <HugeiconsIcon icon={ComputerTerminal01Icon} size={14} />
            <span className="hidden sm:inline">Terminal</span>
          </button>

          {/* Save button */}
          {activeFile?.dirty && (
            <button
              type="button"
              onClick={() => void saveFile()}
              disabled={saving}
              className="mr-2 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                borderColor: 'var(--theme-accent, #60a5fa)',
                color: 'var(--theme-accent, #60a5fa)',
              }}
            >
              {saving ? (
                <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={FloppyDiskIcon} size={12} />
              )}
              Save
            </button>
          )}
        </div>

        {/* ── Editor + Terminal split ─────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor area */}
          <div className="relative flex-1 min-h-0">
            {loadingFile && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--theme-bg)]/80 backdrop-blur-sm">
                <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-[var(--theme-accent)]" />
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
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
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
              /* Empty state */
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
                      Press <kbd className="rounded bg-[var(--theme-card2)] px-1.5 py-0.5 font-mono text-[10px]">Ctrl+S</kbd> to save
                      {' · '}
                      <kbd className="rounded bg-[var(--theme-card2)] px-1.5 py-0.5 font-mono text-[10px]">Ctrl+`</kbd> to toggle terminal
                    </span>
                  </p>
                </div>
              </div>
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
              {promptState?.mode === 'new-folder' ? 'New Folder' : 'New File'}
            </DialogTitle>
            <DialogDescription>
              Enter a name to create in{' '}
              <span className="font-mono bg-primary-100 px-1 py-0.5 rounded text-xs text-primary-800">
                {promptState?.targetPath || 'workspace root'}
              </span>
            </DialogDescription>
            <input
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handlePromptSubmit()
              }}
              className="w-full rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-300"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handlePromptSubmit}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>

      {/* ── Chat pane ─────────────────────────────────────────────────── */}
      {chatOpen && (
        <div 
          className="absolute inset-0 md:static md:w-[420px] w-full shrink-0 border-l flex flex-col z-[100]"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}
        >
          {/* Agent Session Header */}
          <div 
            className="flex h-10 shrink-0 items-center justify-between border-b px-3"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
          >
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setChatOpen(false)} 
                className="md:hidden flex items-center justify-center p-1 -ml-1 rounded hover:bg-white/10"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} style={{ color: 'var(--theme-muted)' }} />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                Agent
              </span>
            </div>
            <select
              value={chatSessionId}
              onChange={(e) => {
                if (e.target.value === '_new') {
                  setChatSessionId('new')
                } else {
                  setChatSessionId(e.target.value)
                }
              }}
              className="max-w-[200px] truncate rounded border px-2 py-1 text-[11px] outline-none transition-colors"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'var(--theme-bg)',
                color: 'var(--theme-text)',
              }}
            >
              {chatSessionId !== 'new' && (
                <option value="_new" style={{ color: 'var(--theme-accent, #60a5fa)', fontWeight: 'bold' }}>
                  + New Session
                </option>
              )}
              {chatSessionId === 'new' && (
                <option value="new">New Session</option>
              )}
              <option disabled>──────────</option>
              <option value="main">Main Session</option>
              <option disabled>──────────</option>
              {sessions.filter((s) => s.key !== 'main').map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title || 'Untitled Session'}
                </option>
              ))}
            </select>
          </div>

          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-[var(--theme-muted)]" />
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
      )}
    </div>
  )
}
