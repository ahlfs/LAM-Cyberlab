/**
 * MobileTerminalInput — Termux-style accessory bar + touch input for Web Terminal.
 * Supports touch devices (iPad, iPad Pro, Android tablets, smartphones).
 * Provides Esc, Tab, Arrow keys (Up, Down, Left, Right), Ctrl/Alt sticky modifiers,
 * Ctrl+C, Ctrl+D, Ctrl+Z shortcuts, quick symbols, and paste.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  Copy01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useTerminalPanelStore } from '@/stores/terminal-panel-store'

async function sendToActiveTab(data: string) {
  const { tabs, activeTabId } = useTerminalPanelStore.getState()
  const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  if (!tab?.sessionId) return
  await fetch('/api/terminal-input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: tab.sessionId, data }),
  }).catch(() => undefined)
}

const QUICK_SYMBOLS = ['~', '/', '-', '_', '|', ':', '$', '&', '>', '<', ';', '"', "'"]

const STORAGE_KEY_SHOW_BAR = 'lam.terminal.extra_keys_visible'

export function MobileTerminalInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ctrlActive, setCtrlActive] = useState(false)
  const [altActive, setAltActive] = useState(false)
  const [showExtraKeys, setShowExtraKeys] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(STORAGE_KEY_SHOW_BAR)
    return stored !== 'false'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOW_BAR, String(showExtraKeys))
    } catch {
      // ignore
    }
  }, [showExtraKeys])

  const sendKey = useCallback((seq: string) => {
    void sendToActiveTab(seq)
  }, [])

  const handleCharInput = useCallback(
    (char: string) => {
      let data = char
      if (ctrlActive) {
        // Compute control character if letter (a-z, A-Z)
        const code = char.toUpperCase().charCodeAt(0)
        if (code >= 64 && code <= 95) {
          data = String.fromCharCode(code - 64)
        } else if (char === ' ') {
          data = '\x00'
        }
        setCtrlActive(false)
      } else if (altActive) {
        data = '\x1b' + char
        setAltActive(false)
      }
      void sendToActiveTab(data)
    },
    [altActive, ctrlActive],
  )

  const send = useCallback(() => {
    const val = inputRef.current?.value
    if (!val) {
      // If empty, send Enter (Carriage Return)
      void sendToActiveTab('\r')
      return
    }

    if (ctrlActive || altActive) {
      // Process first char with active modifiers if any, then remainder
      handleCharInput(val.charAt(0))
      if (val.length > 1) {
        void sendToActiveTab(val.slice(1) + '\r')
      }
    } else {
      void sendToActiveTab(val + '\r')
    }

    if (inputRef.current) inputRef.current.value = ''
  }, [altActive, ctrlActive, handleCharInput])

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && inputRef.current) {
        inputRef.current.value += text
        inputRef.current.focus()
      }
    } catch {
      inputRef.current?.focus()
    }
  }, [])

  return (
    <div
      className="flex flex-col shrink-0 select-none touch-manipulation z-30"
      style={{
        background: '#141414',
        borderTop: '1px solid #2d2d2d',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Termux-Style Extra Keys Row */}
      {showExtraKeys ? (
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto no-scrollbar border-b border-[#252525]"
          style={{ background: '#181818' }}
        >
          {/* ESC */}
          <button
            type="button"
            onClick={() => sendKey('\x1b')}
            className="flex items-center justify-center h-10 min-w-[50px] px-3 rounded-lg font-mono text-xs font-semibold text-neutral-200 bg-[#262626] active:bg-[#3a3a3a] border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Escape key"
          >
            ESC
          </button>

          {/* TAB */}
          <button
            type="button"
            onClick={() => sendKey('\t')}
            className="flex items-center justify-center h-10 min-w-[50px] px-3 rounded-lg font-mono text-xs font-semibold text-neutral-200 bg-[#262626] active:bg-[#3a3a3a] border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Tab key"
          >
            TAB
          </button>

          {/* CTRL Sticky */}
          <button
            type="button"
            onClick={() => setCtrlActive((prev) => !prev)}
            className={cn(
              'flex items-center justify-center h-10 min-w-[50px] px-3 rounded-lg font-mono text-xs font-semibold border transition-colors shrink-0 touch-manipulation',
              ctrlActive
                ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                : 'text-neutral-200 bg-[#262626] active:bg-[#3a3a3a] border-[#383838]',
            )}
            title="Sticky Control key"
          >
            CTRL
          </button>

          {/* ALT Sticky */}
          <button
            type="button"
            onClick={() => setAltActive((prev) => !prev)}
            className={cn(
              'flex items-center justify-center h-10 min-w-[50px] px-3 rounded-lg font-mono text-xs font-semibold border transition-colors shrink-0 touch-manipulation',
              altActive
                ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                : 'text-neutral-200 bg-[#262626] active:bg-[#3a3a3a] border-[#383838]',
            )}
            title="Sticky Alt key"
          >
            ALT
          </button>

          {/* Arrow Navigation Up */}
          <button
            type="button"
            onClick={() => sendKey('\x1b[A')}
            className="flex items-center justify-center h-10 w-10 rounded-lg font-mono text-xs font-bold text-neutral-200 bg-[#262626] active:bg-[#ea580c] active:text-white border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Up Arrow"
            aria-label="Up"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={20} strokeWidth={2.2} />
          </button>

          {/* Arrow Navigation Down */}
          <button
            type="button"
            onClick={() => sendKey('\x1b[B')}
            className="flex items-center justify-center h-10 w-10 rounded-lg font-mono text-xs font-bold text-neutral-200 bg-[#262626] active:bg-[#ea580c] active:text-white border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Down Arrow"
            aria-label="Down"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={2.2} />
          </button>

          {/* Arrow Navigation Left */}
          <button
            type="button"
            onClick={() => sendKey('\x1b[D')}
            className="flex items-center justify-center h-10 w-10 rounded-lg font-mono text-xs font-bold text-neutral-200 bg-[#262626] active:bg-[#ea580c] active:text-white border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Left Arrow"
            aria-label="Left"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.2} />
          </button>

          {/* Arrow Navigation Right */}
          <button
            type="button"
            onClick={() => sendKey('\x1b[C')}
            className="flex items-center justify-center h-10 w-10 rounded-lg font-mono text-xs font-bold text-neutral-200 bg-[#262626] active:bg-[#ea580c] active:text-white border border-[#383838] transition-colors shrink-0 touch-manipulation"
            title="Right Arrow"
            aria-label="Right"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2.2} />
          </button>

          {/* Shortcuts: Ctrl+C, Ctrl+D, Ctrl+Z */}
          <button
            type="button"
            onClick={() => sendKey('\x03')}
            className="flex items-center justify-center h-10 min-w-[44px] px-2.5 rounded-lg font-mono text-xs font-semibold text-rose-300 bg-[#2c1b1b] active:bg-rose-950 border border-rose-900/60 transition-colors shrink-0 touch-manipulation"
            title="Interrupt (SIGINT)"
          >
            ^C
          </button>
          <button
            type="button"
            onClick={() => sendKey('\x04')}
            className="flex items-center justify-center h-10 min-w-[44px] px-2.5 rounded-lg font-mono text-xs font-semibold text-amber-300 bg-[#2a241b] active:bg-amber-950 border border-amber-900/60 transition-colors shrink-0 touch-manipulation"
            title="EOF / Exit"
          >
            ^D
          </button>
          <button
            type="button"
            onClick={() => sendKey('\x1a')}
            className="flex items-center justify-center h-10 min-w-[44px] px-2.5 rounded-lg font-mono text-xs font-semibold text-sky-300 bg-[#1b242a] active:bg-sky-950 border border-sky-900/60 transition-colors shrink-0 touch-manipulation"
            title="Suspend (SIGTSTP)"
          >
            ^Z
          </button>

          {/* Quick Symbol Keys */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[#333]">
            {QUICK_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => sendKey(sym)}
                className="flex items-center justify-center h-10 min-w-[38px] px-2.5 rounded-lg font-mono text-sm font-semibold text-neutral-300 bg-[#202020] active:bg-[#333] active:text-white border border-[#333] transition-colors shrink-0 touch-manipulation"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Command Input Row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Toggle Extra Keys Bar */}
        <button
          type="button"
          onClick={() => setShowExtraKeys((prev) => !prev)}
          className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0 active:opacity-60 transition-colors touch-manipulation"
          style={{
            background: showExtraKeys ? '#222' : '#2a2018',
            color: showExtraKeys ? '#888' : '#ea580c',
            border: showExtraKeys ? '1px solid #333' : '1px solid #ea580c44',
          }}
          title={showExtraKeys ? 'Hide Extra Keys Bar' : 'Show Extra Keys Bar'}
          aria-label="Toggle Extra Keys"
        >
          <HugeiconsIcon
            icon={showExtraKeys ? ViewOffSlashIcon : ViewIcon}
            size={20}
            strokeWidth={1.8}
          />
        </button>

        {/* Paste from clipboard */}
        <button
          type="button"
          onClick={() => void paste()}
          className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0 active:opacity-60 transition-colors touch-manipulation"
          style={{ background: '#252525', color: '#aaa', border: '1px solid #333' }}
          title="Paste from clipboard"
          aria-label="Paste"
        >
          <HugeiconsIcon icon={Copy01Icon} size={19} strokeWidth={1.8} />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              send()
            } else if (e.key === 'Tab') {
              e.preventDefault()
              sendKey('\t')
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              sendKey('\x1b[A')
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              sendKey('\x1b[B')
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              sendKey('\x1b[D')
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              sendKey('\x1b[C')
            } else if (e.key === 'Escape') {
              e.preventDefault()
              sendKey('\x1b')
            }
          }}
          placeholder={
            ctrlActive
              ? 'CTRL active — tap key or type…'
              : altActive
                ? 'ALT active — tap key or type…'
                : 'Type terminal command…'
          }
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 min-w-0 h-10 text-sm outline-none px-3 py-1.5 rounded-lg focus:border-[#ea580c] transition-colors"
          style={{
            background: '#1f1f1f',
            color: '#f0f0f0',
            border: ctrlActive || altActive ? '1px solid #ea580c' : '1px solid #383838',
            fontFamily: 'JetBrains Mono, Menlo, monospace',
          }}
        />

        {/* Send / Enter */}
        <button
          type="button"
          onClick={send}
          className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0 active:scale-95 transition-all shadow-sm touch-manipulation"
          style={{ background: '#ea580c', color: '#fff' }}
          title="Send (Enter)"
          aria-label="Send"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} size={20} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
