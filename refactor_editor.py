import re

with open('src/screens/editor/editor-screen.tsx', 'r') as f:
    content = f.read()

# We want to find the 3 main sections inside the return block.
# 1. Sidebar (lines ~420 to 575)
# 2. Main area (lines ~578 to 882)
# 3. Chat pane (lines ~885 to 949)

# A safe way is to replace the wrapper tags.
# Let's find the Sidebar wrapper:
sidebar_wrapper = """      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col border-r transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden',
        )}
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
      >"""

sidebar_replacement = """      {/* ── Sidebar ──────────────────────────────────────────────── */}
      {(!isMobile ? true : sidebarOpen) && (
        <Panel
          id="sidebar"
          order={1}
          defaultSize={20}
          minSize={15}
          maxSize={40}
          collapsible
          className={cn(
            isMobile && !sidebarOpen ? 'hidden' : '',
            isMobile && 'absolute inset-0 z-[100] border-r-0',
            !sidebarOpen && !isMobile ? 'hidden' : ''
          )}
        >
          <div
            className="flex h-full flex-col border-r"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
          >"""

# Wait, if we use <Panel> on mobile, react-resizable-panels will apply flex-basis/width via inline styles, which conflicts with absolute positioning!
# We can just conditionally render PanelGroup!
