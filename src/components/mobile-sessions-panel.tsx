import { useCallback, useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Chat01Icon, Delete02Icon, Edit02Icon } from '@hugeicons/core-free-icons'
import type { SessionMeta } from '@/screens/chat/types'
import { cn } from '@/lib/utils'
import { SessionRenameDialog } from '@/screens/chat/components/sidebar/session-rename-dialog'
import { SessionDeleteDialog } from '@/screens/chat/components/sidebar/session-delete-dialog'

type Props = {
  open: boolean
  onClose: () => void
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  onSelectSession: (key: string) => void
  onNewChat: () => void
  onDeleteSession?: (key: string, friendlyId: string, isActive: boolean) => Promise<void> | void
  onRenameSession?: (key: string, friendlyId: string | null | undefined, title: string) => Promise<void> | void
}

function normalizeLabel(value: string | undefined): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : ''
}

function getSessionTitle(session: SessionMeta): string {
  const label = normalizeLabel(session.label)
  if (label) return label
  const derivedTitle = normalizeLabel(session.derivedTitle)
  if (derivedTitle) return derivedTitle
  const title = normalizeLabel(session.title)
  if (title) return title
  return `Session ${session.friendlyId.slice(0, 8)}`
}

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function formatUpdatedAt(updatedAt?: number): string {
  if (typeof updatedAt !== 'number') return ''
  const value = new Date(updatedAt)
  const now = new Date()
  if (value.toDateString() === now.toDateString()) {
    return timeFormatter.format(value)
  }
  return dayFormatter.format(value)
}

function useLongPress(callback: (session: SessionMeta) => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const start = useCallback(
    (session: SessionMeta) => {
      isLongPressRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        callback(session)
      }, ms)
    },
    [callback, ms],
  )

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    bind: (session: SessionMeta) => ({
      onTouchStart: () => start(session),
      onTouchEnd: stop,
      onTouchMove: stop,
      onMouseDown: () => start(session),
      onMouseUp: stop,
      onMouseLeave: stop,
    }),
    isLongPress: isLongPressRef,
  }
}

export function MobileSessionsPanel({
  open,
  onClose,
  sessions,
  activeFriendlyId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
}: Props) {
  const [selectedSession, setSelectedSession] = useState<SessionMeta | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleLongPress = useCallback((session: SessionMeta) => {
    setSelectedSession(session)
    setIsActionsOpen(true)
  }, [])

  const { bind, isLongPress } = useLongPress(handleLongPress)

  useEffect(() => {
    if (!open) {
      setIsActionsOpen(false)
      setSelectedSession(null)
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isActionsOpen) {
          setIsActionsOpen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isActionsOpen, onClose])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const handleItemClick = (session: SessionMeta) => {
    if (isLongPress.current) {
      isLongPress.current = false
      return
    }
    onSelectSession(session.friendlyId)
  }

  const handleRename = () => {
    setIsActionsOpen(false)
    setRenameDialogOpen(true)
  }

  const handleDelete = () => {
    setIsActionsOpen(false)
    setDeleteDialogOpen(true)
  }

  const handleConfirmRename = (newTitle: string) => {
    if (selectedSession && onRenameSession) {
      void onRenameSession(selectedSession.key, selectedSession.friendlyId, newTitle)
    }
    setRenameDialogOpen(false)
  }

  const handleConfirmDelete = () => {
    if (selectedSession && onDeleteSession) {
      const isActive = selectedSession.friendlyId === activeFriendlyId
      void onDeleteSession(selectedSession.key, selectedSession.friendlyId, isActive)
    }
    setDeleteDialogOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[97] no-swipe md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        aria-label="Close sessions panel"
        onClick={onClose}
      />

      <aside
        className="no-swipe absolute inset-y-0 left-0 w-[80vw] max-w-sm border-r shadow-2xl animate-in slide-in-from-left-8 duration-200"
        style={{
          background: 'var(--color-surface, #fff)',
          borderColor: 'var(--color-border, #e5e7eb)',
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-primary-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Sessions</h2>
            <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-primary-500">
                <HugeiconsIcon icon={Chat01Icon} size={24} strokeWidth={1.6} />
                <p className="text-sm">No sessions yet.</p>
                <p className="text-xs text-primary-400">
                  Start a conversation to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const active = session.friendlyId === activeFriendlyId
                  const timestamp = formatUpdatedAt(session.updatedAt)
                  return (
                    <button
                      key={session.key}
                      type="button"
                      {...bind(session)}
                      onClick={() => handleItemClick(session)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2.5 text-left transition-all active:scale-[0.99] select-none touch-manipulation cursor-pointer',
                        active
                          ? 'border-[var(--theme-border)] bg-[var(--theme-card2)] font-medium shadow-sm'
                          : 'border-transparent bg-[var(--theme-card)] hover:bg-[var(--theme-card2)]',
                      )}
                    >
                      <div className="truncate text-sm font-medium text-[var(--theme-text)]">
                        {getSessionTitle(session)}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[var(--theme-text)] opacity-60">
                        <span className="truncate">{session.friendlyId}</span>
                        {timestamp ? <span>{timestamp}</span> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Pop-up Action Modal for Long-Pressed Session */}
      {isActionsOpen && selectedSession && (
        <>
          <button
            type="button"
            aria-label="Close session actions"
            className="fixed inset-0 z-[105] bg-black/50 animate-in fade-in duration-150"
            onClick={() => setIsActionsOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-2xl bg-white p-4 pb-safe shadow-2xl animate-in slide-in-from-bottom-6 duration-200 dark:bg-neutral-900"
            role="dialog"
            aria-label="Session actions"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <div className="mb-3 px-1">
              <h3 className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {getSessionTitle(selectedSession)}
              </h3>
              <p className="truncate text-xs text-neutral-400">
                {selectedSession.friendlyId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRename}
                className="flex flex-col items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-left transition-colors active:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/80 dark:active:bg-neutral-800 cursor-pointer"
              >
                <span className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  <HugeiconsIcon icon={Edit02Icon} size={20} strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  Rename
                </span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex flex-col items-start gap-2 rounded-xl border border-red-100 bg-red-50/50 p-3.5 text-left transition-colors active:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:active:bg-red-950/40 cursor-pointer"
              >
                <span className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Delete
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rename Dialog */}
      {selectedSession && (
        <SessionRenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          sessionTitle={
            selectedSession.label ||
            selectedSession.title ||
            selectedSession.derivedTitle ||
            ''
          }
          onSave={handleConfirmRename}
          onCancel={() => setRenameDialogOpen(false)}
        />
      )}

      {/* Delete Dialog */}
      {selectedSession && (
        <SessionDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          sessionTitle={
            selectedSession.label ||
            selectedSession.title ||
            selectedSession.derivedTitle ||
            selectedSession.friendlyId
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteDialogOpen(false)}
        />
      )}
    </div>
  )
}
