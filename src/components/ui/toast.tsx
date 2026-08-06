/**
 * Lightweight toast notification system.
 * Usage: import { toast } from '@/components/ui/toast'
 *        toast('Context compacted', { type: 'info' })
 */
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { 
  InformationCircleIcon, 
  CheckmarkCircle02Icon, 
  Alert01Icon, 
  CancelCircleIcon 
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
  icon?: string
}

let toastId = 0
const listeners: Set<(t: ToastItem) => void> = new Set()

export function toast(
  message: string,
  opts?: { type?: ToastType; duration?: number; icon?: string },
) {
  const item: ToastItem = {
    id: ++toastId,
    message,
    type: opts?.type ?? 'info',
    duration: opts?.duration ?? 5000,
    icon: opts?.icon,
  }
  listeners.forEach((fn) => fn(item))
}

const typeStyles: Record<ToastType, string> = {
  info: 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-blue-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-amber-200',
  error: 'border-rose-500/30 bg-rose-500/10 shadow-[0_0_20px_rgba(225,29,72,0.15)] text-rose-200',
}

const defaultIcons: Record<ToastType, any> = {
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert01Icon,
  error: CancelCircleIcon,
}

export function Toaster() {
  const [toasts, setToasts] = useState<Array<ToastItem>>([])

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => {
      // Dedupe: skip if same message + type already visible
      if (
        prev.some((t) => t.message === item.message && t.type === item.type)
      ) {
        return prev
      }
      return [...prev.slice(-4), item] // max 5
    })
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id))
    }, item.duration)
  }, [])

  useEffect(() => {
    listeners.add(addToast)
    return () => {
      listeners.delete(addToast)
    }
  }, [addToast])

  if (!toasts.length) return null

  return createPortal(
    <div className="pointer-events-none fixed left-2 right-2 z-[9999] flex flex-col gap-2 top-[calc(var(--titlebar-h,0px)+1rem)] sm:left-auto sm:right-4 sm:w-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-[calc(100vw-1rem)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-md animate-in slide-in-from-right-5 fade-in duration-300 sm:w-auto',
            typeStyles[t.type],
          )}
        >
          <div className="flex items-center justify-center size-8 rounded-full bg-black/20 shrink-0 shadow-inner">
            {t.icon ? (
              t.icon.includes('devicon') ? (
                <i className={cn('text-xl drop-shadow-md', t.icon)}></i>
              ) : (
                <span className="text-xl drop-shadow-md">{t.icon}</span>
              )
            ) : (
              <HugeiconsIcon icon={defaultIcons[t.type]} size={20} className="drop-shadow-md" />
            )}
          </div>
          <span className="min-w-0 flex-1 break-words leading-relaxed drop-shadow-sm text-[var(--theme-text)]">
            {t.message}
          </span>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-2 shrink-0 rounded-full p-1.5 opacity-60 transition-all hover:bg-black/20 hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
