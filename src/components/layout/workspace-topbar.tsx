import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Moon02Icon,
  Sun02Icon,
  ComputerTerminal01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSettingsStore } from '@/hooks/use-settings'
import { getThemeVariant, setTheme as applyThemeId, useCurrentTheme } from '@/lib/theme'

const ROUTE_NAME_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/chat': 'Chat',
  '/editor': 'Code Editor',
  '/tasks': 'Tasks & Kanban',
  '/projects': 'Projects',
  '/conductor': 'Conductor',
  '/swarm': 'Agent Swarm',
  '/swarm2': 'Agent Swarm',
  '/operations': 'Operations',
  '/jobs': 'Cron Jobs',
  '/profiles': 'Profiles',
  '/memory': 'Memory Vault',
  '/knowledge': 'Knowledge Base',
  '/graph': 'Concept Graph',
  '/links': 'Graph Links',
  '/skills': 'Skills',
  '/mcp': 'MCP Registry',
  '/terminal': 'Terminal',
  '/files': 'Files',
  '/file-manager': 'File Manager',
  '/system': 'System Health',
  '/remote-access': 'Remote Access',
  '/settings': 'Settings',
}

export function WorkspaceTopbar({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const { pathname } = useLocation()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const { theme: currentTheme, isDark } = useCurrentTheme()

  function toggleThemeMode(event?: React.MouseEvent) {
    const nextVariant = getThemeVariant(currentTheme, isDark ? 'light' : 'dark')
    const nextMode = isDark ? 'light' : 'dark'
    applyThemeId(nextVariant, event, () => {
      updateSettings({ theme: nextMode })
    })
  }

  const activeSection = (() => {
    if (pathname.startsWith('/chat')) return 'Chat'
    if (pathname.startsWith('/editor')) return 'Code Editor'
    if (pathname.startsWith('/tasks')) return 'Tasks & Kanban'
    if (pathname.startsWith('/projects')) return 'Projects'
    if (pathname.startsWith('/conductor')) return 'Conductor'
    if (pathname.startsWith('/swarm')) return 'Agent Swarm'
    if (pathname.startsWith('/operations')) return 'Operations'
    if (pathname.startsWith('/jobs')) return 'Cron Jobs'
    if (pathname.startsWith('/profiles')) return 'Profiles'
    if (pathname.startsWith('/memory')) return 'Memory Vault'
    if (pathname.startsWith('/knowledge')) return 'Knowledge Base'
    if (pathname.startsWith('/graph')) return 'Concept Graph'
    if (pathname.startsWith('/links')) return 'Graph Links'
    if (pathname.startsWith('/skills')) return 'Skills'
    if (pathname.startsWith('/mcp')) return 'MCP Registry'
    if (pathname.startsWith('/terminal')) return 'Terminal'
    if (pathname.startsWith('/file-manager')) return 'File Manager'
    if (pathname.startsWith('/files')) return 'Files'
    if (pathname.startsWith('/system')) return 'System Health'
    if (pathname.startsWith('/remote-access')) return 'Remote Access'
    if (pathname.startsWith('/settings')) return 'Settings'
    return ROUTE_NAME_MAP[pathname] || 'Dashboard'
  })()

  return (
    <header
      className="sticky top-0 z-30 flex h-12 min-h-[48px] shrink-0 items-center justify-between gap-4 border-b px-3.5 backdrop-blur-md font-mono select-none"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-header-bg, var(--theme-bg))',
      }}
    >
      {/* Left: Sidebar toggle + Tactical Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Expand / Minimize Sidebar button */}
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              onClick={onToggleSidebar}
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                  className="size-7 rounded-md shrink-0 opacity-70 hover:opacity-100 hover:bg-[var(--theme-card2,rgba(255,255,255,0.05))] cursor-pointer text-[var(--theme-muted,#8a8f98)] hover:text-[var(--theme-text,#f7f8f8)]"
                >
                  <HugeiconsIcon
                    icon={sidebarCollapsed ? ArrowRight01Icon : ArrowLeft01Icon}
                    size={16}
                    strokeWidth={1.75}
                  />
                </Button>
              }
            />
            <TooltipContent side="bottom">
              {sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--theme-muted,#8a8f98)]/80 uppercase tracking-wider">
            <HugeiconsIcon
              icon={ComputerTerminal01Icon}
              size={14}
              className="text-[var(--theme-accent-secondary,#7170ff)]"
            />
            <span>LAM-CYBERLAB</span>
            <span className="text-[var(--theme-muted,#8a8f98)]/40">/</span>
          </span>

          <span className="font-bold text-xs tracking-tight text-[var(--theme-text,#f7f8f8)]">
            {activeSection}
          </span>
        </div>
      </div>

      {/* Right: Quick actions & Theme Mode Switcher */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={(e) => toggleThemeMode(e)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex size-8 items-center justify-center rounded-md text-[var(--theme-muted,#8a8f98)] hover:text-[var(--theme-text,#f7f8f8)] hover:bg-[var(--theme-card2,rgba(255,255,255,0.05))] cursor-pointer transition-colors"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          <HugeiconsIcon
            icon={isDark ? Sun02Icon : Moon02Icon}
            size={16}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </header>
  )
}
