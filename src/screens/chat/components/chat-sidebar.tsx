import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Atom02Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  CodeIcon,
  BrainIcon,
  Building01Icon,
  Castle02Icon,
  Chat01Icon,
  CheckListIcon,
  Clock01Icon,
  ComputerTerminal01Icon,
  CpuIcon,
  DashboardSquare01Icon,
  GlobeIcon,
  Link01Icon,
  File01Icon,
  Folder01Icon,
  McpServerIcon,
  MessageMultiple01Icon,
  Logout01Icon,
  Moon02Icon,
  PencilEdit02Icon,
  PuzzleIcon,
  Rocket01Icon,
  Search01Icon,
  Settings01Icon,
  SourceCodeSquareIcon,
  Sun02Icon,
  UserGroupIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { CHAT_OPEN_SETTINGS_EVENT } from '../chat-events'
import { useChatSettings as useSidebarSettings } from '../hooks/use-chat-settings'
import { useDeleteSession } from '../hooks/use-delete-session'
import { useRenameSession } from '../hooks/use-rename-session'
import { ProvidersDialog } from './providers-dialog'
import { SessionRenameDialog } from './sidebar/session-rename-dialog'
import { SessionDeleteDialog } from './sidebar/session-delete-dialog'
import { SidebarSessions } from './sidebar/sidebar-sessions'
import type { ChatOpenSettingsDetail } from '../chat-events'
import type { SessionMeta } from '../types'
import { t } from '@/lib/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { UserAvatar } from '@/components/avatars'
import { SEARCH_MODAL_EVENTS, useSearchModal } from '@/hooks/use-search-modal'
import {
  selectChatProfileAvatarDataUrl,
  selectChatProfileDisplayName,
  selectSidebarHoverExpand,
  useChatSettingsStore,
} from '@/hooks/use-chat-settings'
import { StatusDot } from '@/components/status-indicator'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import { applyTheme, useSettingsStore } from '@/hooks/use-settings'
import { getThemeVariant, setTheme as applyThemeWithTransition, useCurrentTheme } from '@/lib/theme'

type WorkspaceStats = Record<string, unknown>

type ChatSidebarProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  creatingSession: boolean
  onCreateSession: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSelectSession?: () => void
  onActiveSessionDelete?: () => void
  sessionsLoading: boolean
  sessionsFetching: boolean
  sessionsError: string | null
  onRetrySessions: () => void
}

// ── Reusable nav item ───────────────────────────────────────────────────

type NavItemDef = {
  kind: 'link' | 'button'
  to?: string
  search?: Record<string, unknown>
  hash?: string
  icon: unknown
  label: string
  active: boolean
  onClick?: () => void
  disabled?: boolean
  badge?: 'error-dot' | string | number
  dataTour?: string
}

export async function fetchWorkspaceStats(): Promise<WorkspaceStats | null> {
  try {
    const response = await fetch('/api/workspace/stats')
    if (!response.ok) return null
    return (await response.json()) as WorkspaceStats
  } catch {
    return null
  }
}

export async function fetchWorkspaceProjectShortcuts(): Promise<Array<never>> {
  return []
}

function NavItem({
  item,
  isCollapsed,
  transition,
  onSelectSession,
}: {
  item: NavItemDef
  isCollapsed: boolean
  transition: Record<string, unknown>
  onSelectSession?: () => void
}) {
  const cls = cn(
    'group/nav relative flex w-full h-8.5 items-center gap-2.5 px-2.5 text-xs transition-all duration-150 rounded-md cursor-pointer select-none',
    isCollapsed ? 'justify-center px-0' : 'justify-start',
    item.active
      ? 'bg-[var(--theme-card2,rgba(255,255,255,0.06))] text-[var(--theme-text,#f7f8f8)] font-semibold border border-[var(--theme-border,rgba(255,255,255,0.08))] shadow-2xs'
      : 'bg-transparent border border-transparent text-[var(--theme-muted,#8a8f98)] opacity-70 hover:opacity-100 hover:bg-[var(--theme-card2,rgba(255,255,255,0.04))] hover:text-[var(--theme-text,#f7f8f8)]',
  )

  const iconEl =
    item.badge === 'error-dot' ? (
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
        <HugeiconsIcon
          icon={item.icon as any}
          size={16}
          strokeWidth={item.active ? 1.9 : 1.6}
          className={cn(
            'size-3.5 shrink-0 transition-colors',
            item.active
              ? 'text-[var(--theme-text,#f7f8f8)]'
              : 'text-[var(--theme-muted,#8a8f98)] group-hover/nav:text-[var(--theme-text,#f7f8f8)]',
          )}
        />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500" />
      </span>
    ) : (
      <HugeiconsIcon
        icon={item.icon as any}
        size={16}
        strokeWidth={item.active ? 1.9 : 1.6}
        className={cn(
          'size-3.5 shrink-0 transition-colors',
          item.active
            ? 'text-[var(--theme-text,#f7f8f8)]'
            : 'text-[var(--theme-muted,#8a8f98)] group-hover/nav:text-[var(--theme-text,#f7f8f8)]',
        )}
      />
    )

  const labelEl = (
    <AnimatePresence initial={false} mode="wait">
      {!isCollapsed ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="flex min-w-0 items-center gap-2"
        >
          <span className="overflow-hidden whitespace-nowrap">
            {item.label}
          </span>
          {item.badge && item.badge !== 'error-dot' ? (
            <span
              className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none"
              style={
                item.badge === 'NEW'
                  ? {
                      background:
                        'linear-gradient(180deg, #fde68a 0%, #fbbf24 50%, #d4a017 100%)',
                      color: '#0b1320',
                      boxShadow: '0 0 8px rgba(250,204,21,0.4)',
                      letterSpacing: '0.08em',
                    }
                  : undefined
              }
            >
              {item.badge}
            </span>
          ) : null}
        </motion.span>
      ) : null}
    </AnimatePresence>
  )

  const handleSelect = () => {
    onSelectSession?.()
  }

  if (item.kind === 'link') {
    if (isCollapsed) {
      return (
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              render={
                <Link
                  to={item.to}
                  search={item.search}
                  hash={item.hash}
                  onClick={handleSelect}
                  className={cls}
                  data-tour={item.dataTour}
                >
                  {iconEl}
                </Link>
              }
            />
            <TooltipContent side="right">{item.label}</TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      )
    }
    return (
      <Link
        to={item.to}
        search={item.search}
        hash={item.hash}
        onClick={handleSelect}
        className={cls}
        data-tour={item.dataTour}
      >
        {iconEl}
        {labelEl}
      </Link>
    )
  }

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger
            render={
              <Button
                disabled={item.disabled}
                variant="ghost"
                size="sm"
                onClick={() => {
                  item.onClick?.()
                  handleSelect()
                }}
                className={cls}
                data-tour={item.dataTour}
              >
                {iconEl}
              </Button>
            }
          />
          <TooltipContent side="right">{item.label}</TooltipContent>
        </TooltipRoot>
      </TooltipProvider>
    )
  }

  return (
    <Button
      disabled={item.disabled}
      variant="ghost"
      size="sm"
      onClick={() => {
        item.onClick?.()
        handleSelect()
      }}
      className={cls}
      data-tour={item.dataTour}
    >
      {iconEl}
      {labelEl}
    </Button>
  )
}

// ── Last-visited route tracking ─────────────────────────────────────────

const LAST_ROUTE_KEY = 'claude-sidebar-last-route'

function getLastRoute(section: string): string | null {
  try {
    const stored = localStorage.getItem(LAST_ROUTE_KEY)
    if (!stored) return null
    const map = JSON.parse(stored) as Record<string, string>
    return map[section] || null
  } catch {
    return null
  }
}

function setLastRoute(section: string, route: string) {
  try {
    const stored = localStorage.getItem(LAST_ROUTE_KEY)
    const map = stored ? (JSON.parse(stored) as Record<string, string>) : {}
    map[section] = route
    localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

// ── Section header ──────────────────────────────────────────────────────

function SectionLabel({
  label,
  isCollapsed,
  transition,
  collapsible,
  expanded,
  onToggle,
}: {
  label: string
  isCollapsed: boolean
  transition: Record<string, unknown>
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
  navigateTo?: string
}) {
  if (isCollapsed) return null

  if (collapsible && onToggle) {
    return (
      <motion.button
        type="button"
        layout
        transition={{ layout: transition }}
        onClick={onToggle}
        className="group/label flex w-full items-center justify-between px-3 pt-3 pb-1 cursor-pointer select-none text-left"
        aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted,#8a8f98)] group-hover/label:text-[var(--theme-text,#f7f8f8)] transition-colors">
          {label}
        </span>
        <span className="p-0.5 rounded transition-colors group-hover/label:bg-[var(--theme-card2,rgba(255,255,255,0.05))]">
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={12}
            strokeWidth={2}
            className={cn(
              'text-[var(--theme-muted,#8a8f98)] group-hover/label:text-[var(--theme-text,#f7f8f8)] transition-transform duration-150',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
          />
        </span>
      </motion.button>
    )
  }

  return (
    <motion.div
      layout
      transition={{ layout: transition }}
      className="px-3 pt-3 pb-1"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted,#8a8f98)] select-none">
        {label}
      </span>
    </motion.div>
  )
}

// ── Collapsible section wrapper ─────────────────────────────────────────

function CollapsibleSection({
  expanded,
  items,
  isCollapsed,
  transition,
  onSelectSession,
}: {
  expanded: boolean
  items: Array<NavItemDef>
  isCollapsed: boolean
  transition: Record<string, unknown>
  onSelectSession?: () => void
}) {
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden space-y-0.5"
        >
          {items.map((item) => (
            <motion.div
              key={item.label}
              layout
              transition={{ layout: transition }}
              className="w-full"
            >
              <NavItem
                item={item}
                isCollapsed={isCollapsed}
                transition={transition}
                onSelectSession={onSelectSession}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Persist helper ──────────────────────────────────────────────────────

function usePersistedBool(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === 'true') return true
      if (stored === 'false') return false
      return defaultValue
    } catch {
      return defaultValue
    }
  })

  function toggle() {
    setValue((prev) => {
      const next = !prev
      try {
        localStorage.setItem(key, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return [value, toggle] as const
}

// ── Main component ──────────────────────────────────────────────────────

export function ChatSidebarComponent(
  props: ChatSidebarProps & { className?: string },
) {
  const {
    sessions,
    activeFriendlyId,
    isCollapsed,
    onToggleCollapse,
    onSelectSession,
    onActiveSessionDelete,
    sessionsLoading,
    sessionsFetching,
    sessionsError,
    onRetrySessions,
  } = props
  const { settingsOpen, settingsSection, setSettingsOpen, handleOpenSettings } =
    useSidebarSettings()
  const { deleteSession } = useDeleteSession()
  const { renameSession } = useRenameSession()
  const openSearchModal = useSearchModal((state) => state.openModal)
  const isSearchModalOpen = useSearchModal((state) => state.isOpen)

  const queryClient = useQueryClient()
  const profilesQuery = useQuery({
    queryKey: ['profiles', 'sidebar'],
    queryFn: async () => {
      const res = await fetch('/api/profiles/list')
      if (!res.ok) throw new Error('failed')
      return await res.json()
    },
    staleTime: 15_000,
  })

  const profileActivateMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/profiles/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('failed')
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace'] }),
        queryClient.invalidateQueries({ queryKey: ['claude', 'models'] }),
      ])
    },
  })

  const activePersonaName =
    profilesQuery.data?.activeProfile ||
    profilesQuery.data?.profiles?.find((p: any) => p.active)?.name ||
    'Misa Amane'
  const pathname = useRouterState({
    select: function selectPathname(state) {
      return state.location.pathname
    },
  })

  useEffect(() => {
    function handleOpenSettingsEvent(event: Event) {
      const detail = (event as CustomEvent<ChatOpenSettingsDetail>).detail
      handleOpenSettings(
        detail.section === 'appearance' ? 'appearance' : 'claude',
      )
    }

    window.addEventListener(CHAT_OPEN_SETTINGS_EVENT, handleOpenSettingsEvent)
    return () => {
      window.removeEventListener(
        CHAT_OPEN_SETTINGS_EVENT,
        handleOpenSettingsEvent,
      )
    }
  }, [handleOpenSettings])

  // Platform-aware modifier key
  const _mod = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
        ? '⌘'
        : 'Ctrl+',
    [],
  )

  // Route active states
  const isChatActive =
    pathname === '/' || pathname === '/new' || pathname.startsWith('/chat')
  const isNewSessionActive =
    pathname === '/new' || pathname.startsWith('/chat/new')
  const _isSettingsActive = pathname === '/settings'
  const isSkillsActive = pathname === '/skills'
  const isMcpActive = pathname === '/mcp'
  const isFilesActive = pathname === '/files'
  const isFileManagerActive = pathname === '/file-manager'
  const isAgoraActive = pathname === '/agora'
  const isTerminalActive = pathname === '/terminal'
  const isJobsActive = pathname === '/jobs'
  const isMemoryActive = pathname === '/memory'
  const isStudyActive = pathname === '/study'
  const isGraphActive = pathname === '/graph'
  const isLinksActive = pathname === '/links'
  const isTasksActive = pathname === '/tasks'
  const isConductorActive = pathname === '/conductor'
  const isOperationsActive = pathname === '/operations'
  const isSwarmActive = pathname === '/swarm' || pathname === '/swarm2'
  const isSystemActive = pathname === '/system'
  const isProjectsActive = pathname === '/projects'
  const isEditorActive = pathname === '/editor'
  const isRemoteAccessActive = pathname === '/remote-access'
  const echoStudioEnabled = useSettingsStore(
    (state) => state.settings.experimentalEchoStudio,
  )
  const workspaceRoutes = ['/dashboard', '/chat', '/new', '/editor', '/tasks', '/projects']
  const agentSwarmRoutes = ['/conductor', '/swarm', '/swarm2', '/operations', '/jobs', '/profiles']
  const knowledgeRoutes = ['/memory', '/graph', '/links', '/skills', '/mcp']
  const infraRoutes = ['/terminal', '/files', '/file-manager', '/system', '/remote-access', '/echo-studio']

  useEffect(() => {
    if (workspaceRoutes.includes(pathname)) setLastRoute('workspace', pathname)
    if (agentSwarmRoutes.includes(pathname)) setLastRoute('agent-swarm', pathname)
    if (knowledgeRoutes.includes(pathname)) setLastRoute('knowledge', pathname)
    if (infraRoutes.includes(pathname)) setLastRoute('infra', pathname)
  }, [pathname])

  const workspaceNav = getLastRoute('workspace') || '/dashboard'
  const agentSwarmNav = getLastRoute('agent-swarm') || '/conductor'
  const knowledgeNav = getLastRoute('knowledge') || '/memory'
  const infraNav = getLastRoute('infra') || '/terminal'

  const transition = {
    duration: 0.15,
    ease: isCollapsed ? 'easeIn' : 'easeOut',
  } as const

  // Collapsible section states (Workspace, Agent Swarm, Knowledge & Brain, Infrastructure)
  const [workspaceExpanded, toggleWorkspace] = usePersistedBool(
    'claude-sidebar-workspace-expanded',
    true,
  )
  const [agentSwarmExpanded, toggleAgentSwarm] = usePersistedBool(
    'claude-sidebar-agent-swarm-expanded',
    true,
  )
  const [knowledgeExpanded, toggleKnowledge] = usePersistedBool(
    'claude-sidebar-knowledge-expanded',
    true,
  )
  const [infraExpanded, toggleInfra] = usePersistedBool(
    'claude-sidebar-infra-expanded',
    true,
  )

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameSessionKey, setRenameSessionKey] = useState<string | null>(null)
  const [renameFriendlyId, setRenameFriendlyId] = useState<string | null>(null)
  const [renameSessionTitle, setRenameSessionTitle] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSessionKey, setDeleteSessionKey] = useState<string | null>(null)
  const [deleteFriendlyId, setDeleteFriendlyId] = useState<string | null>(null)
  const [deleteSessionTitle, setDeleteSessionTitle] = useState('')
  const [providersOpen, setProvidersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const sidebarHoverExpand = useChatSettingsStore(selectSidebarHoverExpand)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  function handleOpenRename(session: SessionMeta) {
    setRenameSessionKey(session.key)
    setRenameFriendlyId(session.friendlyId)
    setRenameSessionTitle(
      session.label || session.title || session.derivedTitle || '',
    )
    setRenameDialogOpen(true)
  }

  function handleSaveRename(newTitle: string) {
    if (renameSessionKey) {
      void renameSession(renameSessionKey, renameFriendlyId, newTitle)
    }
    setRenameDialogOpen(false)
    setRenameSessionKey(null)
    setRenameFriendlyId(null)
  }

  function handleOpenDelete(session: SessionMeta) {
    setDeleteSessionKey(session.key)
    setDeleteFriendlyId(session.friendlyId)
    setDeleteSessionTitle(
      session.label ||
        session.title ||
        session.derivedTitle ||
        session.friendlyId,
    )
    setDeleteDialogOpen(true)
  }

  function handleConfirmDelete() {
    if (deleteSessionKey && deleteFriendlyId) {
      const isActive = deleteFriendlyId === activeFriendlyId
      if (isActive && onActiveSessionDelete) {
        onActiveSessionDelete()
      }
      void deleteSession(deleteSessionKey, deleteFriendlyId, isActive)
    }
    setDeleteDialogOpen(false)
    setDeleteSessionKey(null)
    setDeleteFriendlyId(null)
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isMobile || !isCollapsed || !sidebarHoverExpand) {
      setIsHoverExpanded(false)
    }
  }, [isCollapsed, isMobile, sidebarHoverExpand])

  const isHoverPreviewExpanded =
    sidebarHoverExpand && !isMobile && isCollapsed && isHoverExpanded
  const isVisuallyCollapsed = isCollapsed && !isHoverPreviewExpanded

  const { data: remoteStatus } = useQuery({
    queryKey: ['remote-access-status'],
    queryFn: async () => {
      const res = await fetch('/api/remote-access/status')
      if (!res.ok) return { passwordConfigured: false }
      return res.json()
    },
    staleTime: 60000,
  })
  const showLogout = remoteStatus?.passwordConfigured

  function handleSidebarToggle() {
    // In hover-preview mode, a click should dismiss the preview first;
    // otherwise toggle the persistent collapsed state.
    if (isHoverPreviewExpanded) {
      setIsHoverExpanded(false)
      return
    }
    onToggleCollapse()
  }

  const asideProps = {
    className: cn(
      'border-r h-full overflow-hidden flex flex-col theme-sidebar theme-border select-none',
      isMobile && 'fixed inset-y-0 left-0 z-50 shadow-2xl',
      isMobile && isCollapsed && 'pointer-events-none',
    ),
  }

  useEffect(() => {
    if (!isMobile || isCollapsed) return
    const node = sidebarRef.current
    if (!node) return

    const SWIPE_CLOSE_PX = 64
    const MAX_VERTICAL_DRIFT_PX = 72

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    function handleTouchEnd(event: TouchEvent) {
      const start = swipeStartRef.current
      swipeStartRef.current = null
      if (!start || event.changedTouches.length !== 1) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dy) > MAX_VERTICAL_DRIFT_PX) return
      if (dx <= -SWIPE_CLOSE_PX) {
        onToggleCollapse()
      }
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: true })
    node.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      node.removeEventListener('touchstart', handleTouchStart)
      node.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isCollapsed, isMobile, onToggleCollapse])

  useEffect(() => {
    function handleOpenSettingsFromSearch() {
      handleOpenSettings()
    }

    window.addEventListener(
      SEARCH_MODAL_EVENTS.OPEN_SETTINGS,
      handleOpenSettingsFromSearch,
    )
    return () => {
      window.removeEventListener(
        SEARCH_MODAL_EVENTS.OPEN_SETTINGS,
        handleOpenSettingsFromSearch,
      )
    }
  }, [handleOpenSettings])

  // ── Nav definitions ─────────────────────────────────────────────────

  // Search button definition (placed above Studio section)
  const searchItem: NavItemDef = {
    kind: 'button',
    icon: Search01Icon,
    label: 'Search',
    active: isSearchModalOpen,
    onClick: openSearchModal,
  }

  const isDashboardActive = pathname === '/dashboard'

  // 1. Workspace
  const workspaceItems: Array<NavItemDef> = [
    {
      kind: 'link',
      to: '/dashboard',
      icon: DashboardSquare01Icon,
      label: t('nav.dashboard'),
      active: isDashboardActive,
    },
    {
      kind: 'link',
      to: '/chat',
      icon: MessageMultiple01Icon,
      label: t('nav.chat'),
      active: isChatActive,
    },
    {
      kind: 'link',
      to: '/editor',
      icon: SourceCodeSquareIcon,
      label: 'Code Editor',
      active: isEditorActive,
    },
    {
      kind: 'link',
      to: '/tasks',
      icon: CheckListIcon,
      label: 'Tasks',
      active: isTasksActive,
    },
    {
      kind: 'link',
      to: '/projects',
      icon: CodeIcon,
      label: 'Projects',
      active: isProjectsActive,
    },
  ]

  // 2. Agent Swarm
  const agentSwarmItems: Array<NavItemDef> = [
    {
      kind: 'link',
      to: '/conductor',
      icon: Rocket01Icon,
      label: 'Conductor',
      active: isConductorActive,
    },
    {
      kind: 'link',
      to: '/swarm',
      icon: UserGroupIcon,
      label: 'Swarm',
      active: isSwarmActive,
    },
    {
      kind: 'link',
      to: '/operations',
      icon: UserMultipleIcon,
      label: 'Operations',
      active: isOperationsActive,
    },
    {
      kind: 'link',
      to: '/jobs',
      icon: Clock01Icon,
      label: t('nav.jobs'),
      active: isJobsActive,
    },
    {
      kind: 'link',
      to: '/profiles',
      icon: UserMultipleIcon,
      label: t('nav.profiles'),
      active: pathname === '/profiles',
    },
  ]

  // 3. Knowledge & Brain
  const knowledgeItems: Array<NavItemDef> = [
    {
      kind: 'link',
      to: '/memory',
      icon: BrainIcon,
      label: t('nav.memory'),
      active: isMemoryActive,
    },
    {
      kind: 'link',
      to: '/study',
      icon: BookOpen01Icon,
      label: 'Study Studio',
      active: isStudyActive,
    },
    {
      kind: 'link',
      to: '/graph',
      icon: Atom02Icon,
      label: 'Concept Graph',
      active: isGraphActive,
    },
    {
      kind: 'link',
      to: '/links',
      icon: Link01Icon,
      label: 'Graph Links',
      active: isLinksActive,
    },
    {
      kind: 'link',
      to: '/skills',
      icon: PuzzleIcon,
      label: t('nav.skills'),
      active: isSkillsActive,
      dataTour: 'skills',
    },
    {
      kind: 'link',
      to: '/mcp',
      icon: McpServerIcon,
      label: 'MCP Registry',
      active: isMcpActive,
    },
  ]

  // 4. Infrastructure
  const infraItems: Array<NavItemDef> = [
    {
      kind: 'link',
      to: '/terminal',
      icon: ComputerTerminal01Icon,
      label: t('nav.terminal'),
      active: isTerminalActive,
    },
    {
      kind: 'link',
      to: '/files',
      icon: File01Icon,
      label: t('nav.files'),
      active: isFilesActive,
    },
    {
      kind: 'link',
      to: '/file-manager',
      icon: Folder01Icon,
      label: 'File Manager',
      active: isFileManagerActive,
    },
    {
      kind: 'link',
      to: '/system',
      icon: CpuIcon,
      label: 'System Health',
      active: isSystemActive,
    },
    {
      kind: 'link',
      to: '/remote-access',
      icon: GlobeIcon,
      label: 'Remote Access',
      active: isRemoteAccessActive,
    },
    ...(echoStudioEnabled
      ? [
          {
            kind: 'link' as const,
            to: '/echo-studio',
            icon: DashboardSquare01Icon,
            label: 'Echo Studio',
            active: pathname.startsWith('/echo-studio'),
          },
        ]
      : []),
  ]

  return (
    <motion.aside
      ref={(node) => {
        sidebarRef.current = node
      }}
      initial={false}
      animate={{
        width: isVisuallyCollapsed
          ? isMobile
            ? 0
            : 52
          : isMobile
            ? '85vw'
            : 260,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        asideProps.className,
        isMobile && isCollapsed && 'pointer-events-none overflow-hidden',
      )}
      data-tour="sidebar-container"
      style={isMobile ? { maxWidth: 320 } : undefined}
      onMouseEnter={() => {
        if (sidebarHoverExpand && !isMobile && isCollapsed) {
          setIsHoverExpanded(true)
        }
      }}
      onMouseLeave={() => {
        if (sidebarHoverExpand && !isMobile) setIsHoverExpanded(false)
      }}
      aria-hidden={isMobile && isCollapsed ? true : undefined}
      {...(isMobile && isCollapsed ? { inert: true } : {})}
    >
      {/* ── Header: Machined Branding (LAM Router Design Standard) ── */}
      <motion.div
        layout
        transition={{ layout: transition }}
        className="relative flex h-13 min-h-[52px] shrink-0 items-center justify-between border-b px-3.5"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <AnimatePresence initial={false}>
          {!isVisuallyCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex items-center min-w-0 flex-1 pr-2"
            >
              <Link
                to="/chat"
                className="group flex w-full items-center gap-2.5 rounded-lg py-1 transition-colors text-left"
              >
                {/* Logo Avatar: Clean, borderless and properly sized */}
                <img
                  src="/claude-avatar.webp"
                  alt="LAM Cyberlab Logo"
                  className="size-7 rounded-lg object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="flex flex-col text-left leading-tight min-w-0">
                  <span
                    className="truncate font-semibold text-[13px] tracking-tight transition-colors group-hover:text-[var(--theme-accent-secondary,#7170ff)]"
                    style={{ color: 'var(--theme-text)' }}
                  >
                    LAM Cyberlab
                  </span>
                  <span className="text-[9.5px] font-mono font-medium tracking-tight mt-0.5 truncate text-[var(--theme-muted,#8a8f98)]">
                    Autonomous Workspace
                  </span>
                </div>
              </Link>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <img
                src="/claude-avatar.webp"
                alt="LAM Cyberlab Logo"
                className="size-7 rounded-lg object-contain shrink-0"
              />
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Search (ChatGPT-style, above sections) ─────────────────── */}
      <div className="px-2 pb-1">
        <motion.div
          layout
          transition={{ layout: transition }}
          className="w-full"
        >
          <NavItem
            item={searchItem}
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            onSelectSession={onSelectSession}
          />
        </motion.div>
      </div>

      {/* ── New Session button ──────────────────────────────────────── */}
      {!isVisuallyCollapsed && (
        <div className="px-2 pb-2">
          <Link
            to="/chat/$sessionKey"
            params={{ sessionKey: 'new' }}
            onClick={() => {
              onSelectSession?.()
            }}
            className={cn(
              'group/new flex w-full h-8.5 items-center justify-start gap-2.5 px-2.5 rounded-md text-xs transition-all duration-150 select-none border cursor-pointer',
              isNewSessionActive
                ? 'bg-[var(--theme-card2,rgba(255,255,255,0.06))] text-[var(--theme-text,#f7f8f8)] font-semibold border-[var(--theme-border,rgba(255,255,255,0.08))] shadow-2xs'
                : 'bg-transparent border-transparent text-[var(--theme-muted,#8a8f98)] opacity-70 hover:opacity-100 hover:bg-[var(--theme-card2,rgba(255,255,255,0.04))] hover:text-[var(--theme-text,#f7f8f8)]',
            )}
            data-tour="new-session"
          >
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={16}
              strokeWidth={isNewSessionActive ? 1.9 : 1.6}
              className={cn(
                'size-3.5 shrink-0 transition-colors',
                isNewSessionActive
                  ? 'text-[var(--theme-text,#f7f8f8)]'
                  : 'text-[var(--theme-muted,#8a8f98)] group-hover/new:text-[var(--theme-text,#f7f8f8)]',
              )}
            />
            <span className="truncate">New Session</span>
          </Link>
        </div>
      )}

      {/* ── Scrollable body: nav + sessions ─────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-swipe scrollbar-thin flex flex-col">
        {/* Navigation sections */}
        <div className={cn('shrink-0 space-y-0.5 px-2', isMobile && 'order-2')}>
          {/* 1. Workspace */}
          <SectionLabel
            label="Workspace"
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            collapsible
            expanded={workspaceExpanded}
            onToggle={toggleWorkspace}
          />
          <CollapsibleSection
            expanded={workspaceExpanded || isCollapsed}
            items={workspaceItems}
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            onSelectSession={onSelectSession}
          />

          {/* 2. Agent Swarm */}
          <SectionLabel
            label="Agent Swarm"
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            collapsible
            expanded={agentSwarmExpanded}
            onToggle={toggleAgentSwarm}
          />
          <CollapsibleSection
            expanded={agentSwarmExpanded || isCollapsed}
            items={agentSwarmItems}
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            onSelectSession={onSelectSession}
          />

          {/* 3. Knowledge & Brain */}
          <SectionLabel
            label="Knowledge & Brain"
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            collapsible
            expanded={knowledgeExpanded}
            onToggle={toggleKnowledge}
          />
          <CollapsibleSection
            expanded={knowledgeExpanded || isCollapsed}
            items={knowledgeItems}
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            onSelectSession={onSelectSession}
          />

          {/* 4. Infrastructure */}
          <SectionLabel
            label="Infrastructure"
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            collapsible
            expanded={infraExpanded}
            onToggle={toggleInfra}
          />
          <CollapsibleSection
            expanded={infraExpanded || isCollapsed}
            items={infraItems}
            isCollapsed={isVisuallyCollapsed}
            transition={transition}
            onSelectSession={onSelectSession}
          />
        </div>

        {/* Sessions list */}
        <div className={cn('shrink-0 mt-1', isMobile && 'order-1')}>
          <AnimatePresence initial={false}>
            {!isVisuallyCollapsed && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="flex flex-col w-full min-h-0 h-full"
              >
                <div className="flex-1 min-h-0">
                  <SidebarSessions
                    sessions={sessions}
                    activeFriendlyId={activeFriendlyId}
                    onSelect={onSelectSession}
                    onRename={handleOpenRename}
                    onDelete={handleOpenDelete}
                    loading={sessionsLoading}
                    fetching={sessionsFetching}
                    error={sessionsError}
                    onRetry={onRetrySessions}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* end scrollable body */}

      {/* ── Footer: Active Agent Profile (LAM Router Standard) ── */}
      <div
        className="px-2.5 py-2.5 border-t shrink-0 flex items-center justify-between"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-sidebar)' }}
      >
        <div
          className={cn(
            'flex items-center rounded-lg transition-colors w-full',
            isVisuallyCollapsed ? 'flex-col gap-2 py-1' : 'justify-between gap-1.5',
          )}
        >
          {/* Active Profile Switcher */}
          <MenuRoot>
            <MenuTrigger
              data-tour="active-profile"
              className={cn(
                'group/profile flex items-center gap-2 rounded-lg py-1 transition-colors hover:bg-[var(--theme-card2,rgba(255,255,255,0.05))] flex-1 min-w-0 cursor-pointer text-left',
                isVisuallyCollapsed ? 'justify-center px-0' : 'px-1.5',
              )}
            >
              {/* Profile Avatar Badge */}
              <div
                className="size-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--theme-border,rgba(255,255,255,0.1))] text-white shadow-2xs"
                style={{
                  background: 'linear-gradient(135deg, var(--theme-accent, #5e6ad2), var(--theme-accent-secondary, #7170ff))',
                }}
              >
                {activePersonaName.charAt(0).toUpperCase()}
              </div>

              <AnimatePresence initial={false} mode="wait">
                {!isVisuallyCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="flex-1 min-w-0 flex flex-col justify-center leading-tight"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-xs font-semibold text-[var(--theme-text,#f7f8f8)] group-hover/profile:text-[var(--theme-accent-secondary,#7170ff)] transition-colors">
                        {activePersonaName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[9.5px] font-mono text-[var(--theme-muted,#8a8f98)] truncate">
                        Active Profile
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </MenuTrigger>

            <MenuContent
              side="top"
              align="start"
              className="min-w-[220px] max-w-[280px] p-1.5 border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-panel,#0d0e11)] shadow-2xl rounded-xl text-[var(--theme-text,#f7f8f8)]"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted,#8a8f98)]">
                Switch Agent Profile
              </div>

              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {(profilesQuery.data?.profiles ?? []).map((profile: any) => {
                  const isSelected = profile.name === activePersonaName
                  return (
                    <MenuItem
                      key={profile.name}
                      onClick={() => {
                        if (!isSelected) {
                          profileActivateMutation.mutate(profile.name)
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-[var(--theme-accent-subtle,rgba(94,106,210,0.15))] text-[var(--theme-accent-secondary,var(--theme-accent,#7170ff))] font-semibold'
                          : 'text-[var(--theme-muted,#8a8f98)] hover:bg-[var(--theme-card2,rgba(255,255,255,0.06))] hover:text-[var(--theme-text,#f7f8f8)]',
                      )}
                    >
                      <span className="truncate">{profile.name}</span>
                      {isSelected ? (
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={13}
                          className="text-[var(--theme-accent,#5e6ad2)] shrink-0 ml-2"
                        />
                      ) : null}
                    </MenuItem>
                  )
                })}
              </div>

              <div className="h-px bg-[var(--theme-border,rgba(255,255,255,0.08))] my-1.5" />

              <MenuItem
                onClick={() => {
                  handleOpenSettings('claude')
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--theme-muted,#8a8f98)] hover:text-[var(--theme-text,#f7f8f8)] hover:bg-[var(--theme-card2,rgba(255,255,255,0.06))] cursor-pointer"
              >
                <HugeiconsIcon icon={Settings01Icon} size={14} />
                <span>Workspace Settings</span>
              </MenuItem>
            </MenuContent>
          </MenuRoot>

          {/* Quick Settings & Logout Actions */}
          {!isVisuallyCollapsed && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenSettings('claude')}
                className="shrink-0 rounded-md p-1.5 text-[var(--theme-muted,#8a8f98)] hover:bg-[var(--theme-card2,rgba(255,255,255,0.05))] hover:text-[var(--theme-text,#f7f8f8)] transition-colors cursor-pointer"
                aria-label="Settings"
                title="Settings"
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={15}
                  strokeWidth={1.75}
                />
              </button>
              {showLogout && (
                <AlertDialogRoot>
                  <AlertDialogTrigger
                    className="shrink-0 rounded-md p-1.5 text-[var(--theme-muted,#8a8f98)] hover:bg-[var(--theme-card2,rgba(255,255,255,0.05))] hover:text-[var(--theme-danger,#f43f5e)] transition-colors cursor-pointer"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      size={15}
                      strokeWidth={1.75}
                    />
                  </AlertDialogTrigger>
                  <AlertDialogContent className="p-5">
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to log out of the workspace? You
                      will need to enter the password to access it again.
                    </AlertDialogDescription>
                    <div className="mt-6 flex justify-end gap-3">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await fetch('/api/auth', { method: 'DELETE' })
                          window.location.reload()
                        }}
                        className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
                      >
                        Logout
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialogRoot>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSection={settingsSection}
      />

      <ProvidersDialog open={providersOpen} onOpenChange={setProvidersOpen} />

      <SessionRenameDialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) {
            setRenameSessionKey(null)
            setRenameFriendlyId(null)
            setRenameSessionTitle('')
          }
        }}
        sessionTitle={renameSessionTitle}
        onSave={handleSaveRename}
        onCancel={() => {
          setRenameDialogOpen(false)
          setRenameSessionKey(null)
          setRenameFriendlyId(null)
          setRenameSessionTitle('')
        }}
      />

      <SessionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sessionTitle={deleteSessionTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </motion.aside>
  )
}

function areSessionsEqual(
  prevSessions: Array<SessionMeta>,
  nextSessions: Array<SessionMeta>,
): boolean {
  if (prevSessions === nextSessions) return true
  if (prevSessions.length !== nextSessions.length) return false
  for (let i = 0; i < prevSessions.length; i += 1) {
    const prev = prevSessions[i]
    const next = nextSessions[i]
    if (prev.key !== next.key) return false
    if (prev.friendlyId !== next.friendlyId) return false
    if (prev.label !== next.label) return false
    if (prev.title !== next.title) return false
    if (prev.derivedTitle !== next.derivedTitle) return false
    if (prev.updatedAt !== next.updatedAt) return false
    if (prev.titleStatus !== next.titleStatus) return false
    if (prev.titleSource !== next.titleSource) return false
    if (prev.titleError !== next.titleError) return false
  }
  return true
}

function areSidebarPropsEqual(
  prevProps: ChatSidebarProps,
  nextProps: ChatSidebarProps,
): boolean {
  if (prevProps.activeFriendlyId !== nextProps.activeFriendlyId) return false
  if (prevProps.creatingSession !== nextProps.creatingSession) return false
  if (prevProps.isCollapsed !== nextProps.isCollapsed) return false
  if (prevProps.sessionsLoading !== nextProps.sessionsLoading) return false
  if (prevProps.sessionsFetching !== nextProps.sessionsFetching) return false
  if (prevProps.sessionsError !== nextProps.sessionsError) return false
  if (prevProps.onRetrySessions !== nextProps.onRetrySessions) return false
  if (!areSessionsEqual(prevProps.sessions, nextProps.sessions)) return false
  return true
}

const MemoizedChatSidebar = memo(ChatSidebarComponent, areSidebarPropsEqual)

export { MemoizedChatSidebar as ChatSidebar }
