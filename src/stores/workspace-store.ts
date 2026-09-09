import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  sidebarCollapsed: boolean
  fileExplorerCollapsed: boolean
  chatFocusMode: boolean
  /** Currently active sub-page route (e.g. '/skills', '/channels') — null means chat-only */
  activeSubPage: string | null
  /** Chat panel visible alongside non-chat routes */
  chatPanelOpen: boolean
  /** Session key for the general chat panel (defaults to 'main') */
  chatPanelSessionKey: string
  /** Dedicated Session key specifically for Code Editor Agent (isolated from general chat) */
  editorSessionKey: string
  /** The directory/workspace currently selected in the Code Editor */
  activeWorkspacePath: string | null
  /** File path currently open in the Code Editor — used for breadcrumb context injection */
  activeEditorFile: string | null
  /** Favorite / Starred project folder paths */
  favoriteProjectPaths: string[]
  /** Mobile keyboard / composer focus — hides tab bar */
  mobileKeyboardOpen: boolean
  mobileKeyboardInset: number
  mobileComposerFocused: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleFileExplorer: () => void
  setFileExplorerCollapsed: (collapsed: boolean) => void
  toggleChatFocusMode: () => void
  setChatFocusMode: (enabled: boolean) => void
  setActiveSubPage: (page: string | null) => void
  toggleChatPanel: () => void
  setChatPanelOpen: (open: boolean) => void
  setChatPanelSessionKey: (key: string) => void
  setEditorSessionKey: (key: string) => void
  setActiveWorkspacePath: (path: string | null) => void
  setActiveEditorFile: (path: string | null) => void
  toggleFavoriteProject: (path: string) => void
  setMobileKeyboardOpen: (open: boolean) => void
  setMobileKeyboardInset: (inset: number) => void
  setMobileComposerFocused: (focused: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      fileExplorerCollapsed: true,
      chatFocusMode: false,
      activeSubPage: null,
      chatPanelOpen: false,
      chatPanelSessionKey: 'main',
      editorSessionKey: 'new',
      activeWorkspacePath: null,
      activeEditorFile: null,
      favoriteProjectPaths: [],
      mobileKeyboardOpen: false,
      mobileKeyboardInset: 0,
      mobileComposerFocused: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleFileExplorer: () =>
        set((s) => ({ fileExplorerCollapsed: !s.fileExplorerCollapsed })),
      setFileExplorerCollapsed: (collapsed) =>
        set({ fileExplorerCollapsed: collapsed }),
      toggleChatFocusMode: () =>
        set((s) => ({ chatFocusMode: !s.chatFocusMode })),
      setChatFocusMode: (enabled) => set({ chatFocusMode: enabled }),
      setActiveSubPage: (page) => set({ activeSubPage: page }),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
      setChatPanelSessionKey: (key) => set({ chatPanelSessionKey: key }),
      setEditorSessionKey: (key) => set({ editorSessionKey: key }),
      setActiveWorkspacePath: (path) => set({ activeWorkspacePath: path }),
      setActiveEditorFile: (path) => set({ activeEditorFile: path }),
      toggleFavoriteProject: (path) =>
        set((s) => ({
          favoriteProjectPaths: s.favoriteProjectPaths.includes(path)
            ? s.favoriteProjectPaths.filter((p) => p !== path)
            : [...s.favoriteProjectPaths, path],
        })),
      setMobileKeyboardOpen: (open) => set({ mobileKeyboardOpen: open }),
      setMobileKeyboardInset: (inset) => set({ mobileKeyboardInset: inset }),
      setMobileComposerFocused: (focused) =>
        set({ mobileComposerFocused: focused }),
    }),
    {
      name: 'hermes-workspace-v1',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        fileExplorerCollapsed: state.fileExplorerCollapsed,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelSessionKey: state.chatPanelSessionKey,
        editorSessionKey: state.editorSessionKey,
        activeWorkspacePath: state.activeWorkspacePath,
        favoriteProjectPaths: state.favoriteProjectPaths,
      }),
    },
  ),
)
