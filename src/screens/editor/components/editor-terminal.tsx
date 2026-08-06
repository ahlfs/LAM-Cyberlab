/**
 * EditorTerminal — lightweight xterm.js terminal embedded inside the Code Editor.
 * Connects via SSE to /api/terminal-stream with configurable cwd.
 */
import 'xterm/css/xterm.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

interface EditorTerminalProps {
  cwd?: string
  height: number
}

export function EditorTerminal({ cwd, height }: EditorTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const logSaveTimerRef = useRef<number | null>(null)
  const [connected, setConnected] = useState(false)

  /* ── Connect to terminal stream ─────────────────────────────────── */

  const connect = useCallback(async (term: Terminal) => {
    try {
      // 1. Cek apakah ada sesi tersimpan untuk cwd ini
      const storageKey = `editor.terminal.${cwd || 'root'}`
      const stored = localStorage.getItem(storageKey)
      let attachSessionId: string | undefined
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          attachSessionId = parsed.sessionId
          if (parsed.log) {
            term.write(parsed.log) // Tampilkan log lama sebelum reattach
          }
        } catch {
          // ignore
        }
      }

      const response = await fetch('/api/terminal-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cwd: cwd || '~',
          cols: term.cols,
          rows: term.rows,
          sessionId: attachSessionId, // Kirim sessionId untuk reattach (jika ada)
        }),
      })

      if (!response.ok || !response.body) {
        term.writeln('\r\n[terminal] Failed to connect\r\n')
        return
      }

      const reader = response.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''
      let currentLog = stored ? JSON.parse(stored).log || '' : ''

      setConnected(true)

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue
          const lines = eventBlock.split('\n')
          let currentEvent = ''
          let currentData = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              currentData += line.slice(6)
            } else if (line.startsWith('data:')) {
              currentData += line.slice(5)
            }
          }
          if (!currentEvent || !currentData) continue
          try {
            const payload = JSON.parse(currentData)
            
            if (currentEvent === 'session') {
              sessionIdRef.current = payload.sessionId
              // Simpan sesi baru ke localStorage
              localStorage.setItem(storageKey, JSON.stringify({
                sessionId: payload.sessionId,
                log: currentLog
              }))
              continue
            }
            
            if (currentEvent === 'exit' || currentEvent === 'close') {
              const exitInfo =
                currentEvent === 'exit' && typeof payload === 'object'
                  ? ` (exit code ${payload?.code ?? '?'}${payload?.signal ? `, signal ${payload.signal}` : ''})`
                  : ''
              term.writeln(`\r\n\x1b[2m[session ended${exitInfo}]\x1b[0m`)
              sessionIdRef.current = null
              setConnected(false)
              if (logSaveTimerRef.current) window.clearTimeout(logSaveTimerRef.current)
              // Hapus dari localStorage karena proses sudah mati
              localStorage.removeItem(storageKey)
              continue
            }
            
            if (currentEvent === 'data') {
              const textChunk =
                payload?.data ??
                payload?.text ??
                payload?.chunk ??
                payload?.output
              if (typeof textChunk === 'string') {
                term.write(textChunk)
                term.focus()
                currentLog += textChunk
                // Update log di localStorage with debounce to prevent UI freeze
                if (sessionIdRef.current) {
                  if (logSaveTimerRef.current) window.clearTimeout(logSaveTimerRef.current)
                  logSaveTimerRef.current = window.setTimeout(() => {
                    localStorage.setItem(storageKey, JSON.stringify({
                      sessionId: sessionIdRef.current,
                      log: currentLog
                    }))
                  }, 500)
                }
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      term.writeln('\r\n[terminal] Connection error\r\n')
      setConnected(false)
    }
  }, [cwd])

  /* ── Send input ─────────────────────────────────────────────────── */

  const sendInput = useCallback(async (data: string) => {
    if (!sessionIdRef.current) return
    await fetch('/api/terminal-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current, data }),
    }).catch(() => undefined)
  }, [])

  /* ── Init terminal ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!containerRef.current) return
    if (terminalRef.current) return

    const terminal = new Terminal({
      theme: {
        background: '#0b0f1a',
      },
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
      scrollback: 1000,
      convertEol: true,
    })
    const fitAddon = new FitAddon()
    const webLinks = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinks)
    terminal.open(containerRef.current)
    fitAddon.fit()

    terminal.onData((data) => {
      void sendInput(data)
    })

    terminalRef.current = terminal
    fitRef.current = fitAddon

    void connect(terminal)

    return () => {
      // TIDAK LAGI memanggil /api/terminal-close di sini.
      // Sesi dibiarkan berjalan di backend (Persistent).
      readerRef.current?.cancel().catch(() => undefined)
      terminal.dispose()
      terminalRef.current = null
      fitRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Refit on height change ─────────────────────────────────────── */

  useEffect(() => {
    const timer = setTimeout(() => {
      fitRef.current?.fit()
      if (terminalRef.current && sessionIdRef.current) {
        void fetch('/api/terminal-resize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows,
          }),
        }).catch(() => undefined)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [height])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{
        height: `${height}px`,
        background: '#0b0f1a',
      }}
    />
  )
}
