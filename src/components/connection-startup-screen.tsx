import { useEffect, useRef, useState } from 'react'
import type { AuthStatus } from '@/lib/claude-auth'
import { writeTextToClipboard } from '@/lib/clipboard'
import { fetchClaudeAuthStatus } from '@/lib/claude-auth'

const POLL_INTERVAL_MS = 2_000
const FAILURE_REVEAL_MS = 5_000
// Fire one silent auto-start attempt this many ms after we still can't connect.
const AUTO_START_DELAY_MS = 4_000

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'macos'
  if (ua.includes('linux')) return 'linux'
  return 'unknown'
}

function getSetupSteps(
  platform: Platform,
): Array<{ title: string; command: string; note?: string }> {
  return [
    {
      title: 'Use any OpenAI-compatible backend',
      command: 'Set HERMES_API_URL to your backend base URL',
      note: 'Portable chat works with any backend that exposes /v1/chat/completions (Ollama, LiteLLM, vLLM, etc.)',
    },
    {
      title: 'Optional: install Hermes Agent locally',
      command:
        'curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash',
      note: 'Vanilla hermes-agent unlocks sessions, skills, memory, jobs, and config automatically — no fork required',
    },
    {
      title: 'Set up your agent',
      command: 'hermes setup',
      note: 'Pick your providers once; Hermes Agent stores them under ~/.hermes',
    },
    {
      title: 'Start the gateway',
      command: 'hermes gateway run',
      note: 'This starts the HTTP API on :8642 for the workspace',
    },
  ]
}

type Props = { onConnected: (status: AuthStatus) => void }

declare global {
  interface Window {
    __dismissSplash?: () => void
  }
}

export function ConnectionStartupScreen({ onConnected }: Props) {
  const [showFailureState, setShowFailureState] = useState(false)
  const [serverStarting, setServerStarting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverLog, setServerLog] = useState<Array<string>>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showManual, setShowManual] = useState(false)

  const platform = useRef<Platform>(detectPlatform())
  const steps = getSetupSteps(platform.current)

  const onConnectedRef = useRef(onConnected)
  useEffect(() => {
    onConnectedRef.current = onConnected
  }, [onConnected])

  const isDone = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismiss = window.__dismissSplash
    if (!dismiss) return
    const timer = setTimeout(() => dismiss(), 60)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    isDone.current = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let autoStartTimer: ReturnType<typeof setTimeout> | null = null
    let autoStartFired = false

    const failureTimer = setTimeout(() => {
      if (!isDone.current) {
        setShowFailureState(true)
      }
    }, FAILURE_REVEAL_MS)

    // After a short grace period, fire /api/start-claude once silently.
    // If hermes-agent is installed and just not running, this brings it back
    // up without making the user click anything. The polling loop will see it.
    const fireSilentAutoStart = async () => {
      if (autoStartFired || isDone.current) return
      autoStartFired = true
      try {
        const res = await fetch('/api/start-claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) return
        const data = (await res.json()) as { ok?: boolean; message?: string }
        if (res.ok && data.ok) {
          // surface a one-line note so users see what happened if they're
          // looking at the failure panel
          setServerLog([
            String(
              data.message ||
                'Auto-started Hermes Agent gateway — reconnecting…',
            ),
          ])
        }
      } catch {
        // silent: manual auto-start button stays available
      }
    }
    autoStartTimer = setTimeout(() => {
      void fireSilentAutoStart()
    }, AUTO_START_DELAY_MS)

    const tryConnect = async () => {
      try {
        const status = await fetchClaudeAuthStatus()
        if (isDone.current) return
        isDone.current = true
        clearTimeout(failureTimer)
        if (autoStartTimer) clearTimeout(autoStartTimer)
        if (pollTimer) clearTimeout(pollTimer)
        onConnectedRef.current(status)
      } catch {
        if (isDone.current) return
        pollTimer = setTimeout(tryConnect, POLL_INTERVAL_MS)
      }
    }

    void tryConnect()

    return () => {
      isDone.current = true
      if (pollTimer) clearTimeout(pollTimer)
      if (autoStartTimer) clearTimeout(autoStartTimer)
      clearTimeout(failureTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (copiedIdx === null) return
    const timer = setTimeout(() => setCopiedIdx(null), 2_000)
    return () => clearTimeout(timer)
  }, [copiedIdx])

  const handleCopy = async (text: string, idx: number) => {
    try {
      await writeTextToClipboard(text)
      setCopiedIdx(idx)
    } catch {
      /* clipboard not available */
    }
  }

  const handleAutoStart = async () => {
    setServerStarting(true)
    setServerError(null)
    setServerLog(['Looking for hermes-agent...'])
    try {
      const res = await fetch('/api/start-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const msg = `Unexpected response (${res.status})`
        setServerLog([`Error: ${msg}`])
        setServerError(msg)
        setServerStarting(false)
        return
      }

      const data = (await res.json()) as Record<string, unknown>
      if (res.ok && data.ok) {
        setServerLog([
          String(data.message || 'Started — waiting for connection...'),
        ])
        setServerStarting(false)
        return
      }

      const msg = String(data.error || 'Could not find hermes-agent')
      const hint = data.hint ? String(data.hint) : ''
      setServerLog([`Error: ${msg}`])
      if (hint) setServerLog((prev) => [...prev, `Hint: ${hint}`])
      setServerError(msg)
      setServerStarting(false)
      // Show manual steps when auto-start fails
      setShowManual(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setServerLog([`Failed: ${msg}`])
      setServerError(msg)
      setServerStarting(false)
      setShowManual(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-6 py-10 text-[var(--theme-text,#f7f8f8)] bg-[var(--theme-bg,#08090a)] transition-colors duration-300"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        {/* Avatar with glowing ring */}
        <div className="relative mb-8 group">
          <div
            className="absolute -inset-1 rounded-[1.25rem] opacity-50 blur-md animate-pulse"
            style={{
              background:
                'radial-gradient(circle, var(--theme-accent,#5e6ad2) 0%, transparent 70%)',
            }}
          />
          <img
            src="/claude-avatar.webp"
            alt="LAM Cyberlab"
            className="relative h-24 w-24 rounded-2xl object-cover shadow-2xl border border-[var(--theme-border,rgba(255,255,255,0.1))]"
            style={{
              boxShadow:
                '0 0 30px var(--theme-accent-subtle, rgba(94,106,210,0.25))',
            }}
          />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--theme-text,#f7f8f8)] mb-1">
          LAM Cyberlab
        </h1>
        <p className="text-xs font-mono text-[var(--theme-muted,#8a8f98)] mb-2">
          Autonomous Workspace
        </p>

        {/* Connecting spinner */}
        <div
          className={[
            'mt-6 flex flex-col items-center gap-3 transition-all duration-500',
            showFailureState
              ? 'opacity-0 scale-95 h-0 overflow-hidden'
              : 'opacity-100 scale-100',
          ].join(' ')}
          aria-hidden={showFailureState}
        >
          <div className="flex gap-2 items-center justify-center h-8">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-accent,#5e6ad2)] opacity-80 animate-[bounce_1.4s_infinite_0s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-accent-secondary,var(--theme-accent,#7170ff))] opacity-90 animate-[bounce_1.4s_infinite_0.2s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-accent,#5e6ad2)] opacity-100 animate-[bounce_1.4s_infinite_0.4s]" />
          </div>
          <span className="font-semibold tracking-wider uppercase text-[11px] text-[var(--theme-accent-secondary,var(--theme-accent,#7170ff))]">
            Connecting to Backend...
          </span>
        </div>

        {/* Failure state — setup guide */}
        <div
          className={[
            'w-full overflow-hidden transition-all duration-500 ease-out',
            showFailureState
              ? 'mt-6 max-h-[60rem] translate-y-0 opacity-100'
              : 'max-h-0 translate-y-2 opacity-0',
          ].join(' ')}
        >
          <div className="w-full rounded-2xl border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-card,rgba(255,255,255,0.02))] p-5 text-left shadow-2xl backdrop-blur-sm">
            <p className="text-base font-semibold text-[var(--theme-text,#f7f8f8)]">
              Welcome! Let&apos;s connect your backend
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--theme-muted,#8a8f98)]">
              LAM Cyberlab works with any OpenAI-compatible backend. Hermes
              Agent gateway APIs unlock enhanced features automatically when
              they are available.
            </p>

            {/* Auto-start section */}
            <div className="mt-5">
              <button
                type="button"
                disabled={serverStarting}
                onClick={handleAutoStart}
                className={[
                  'w-full rounded-xl px-5 py-2.5 text-xs font-semibold transition-all cursor-pointer shadow-sm',
                  serverStarting
                    ? 'cursor-not-allowed opacity-60 bg-[var(--theme-card2)] text-[var(--theme-muted)]'
                    : 'bg-[var(--theme-accent,#5e6ad2)] text-white hover:opacity-90',
                ].join(' ')}
              >
                {serverStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                    Detecting Hermes Agent...
                  </span>
                ) : (
                  'Auto-Start Hermes Agent Gateway'
                )}
              </button>

              {/* Server log */}
              {serverLog.length > 0 ? (
                <div
                  className={[
                    'mt-3 rounded-xl border p-3',
                    serverError
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  ].join(' ')}
                >
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-5">
                    {serverLog.join('\n')}
                  </pre>
                </div>
              ) : null}
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--theme-border,rgba(255,255,255,0.08))]" />
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="text-xs font-medium text-[var(--theme-muted,#8a8f98)] transition hover:text-[var(--theme-text,#f7f8f8)] cursor-pointer"
              >
                {showManual ? 'Hide' : 'Show'} manual setup
              </button>
              <div className="h-px flex-1 bg-[var(--theme-border,rgba(255,255,255,0.08))]" />
            </div>

            {/* Manual setup steps */}
            <div
              className={[
                'overflow-hidden transition-all duration-300',
                showManual ? 'max-h-[40rem] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-card2,rgba(255,255,255,0.04))] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent-subtle,rgba(94,106,210,0.15))] text-[10px] font-bold text-[var(--theme-accent-secondary,var(--theme-accent,#7170ff))] border border-[var(--theme-accent,#5e6ad2)]/30">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-[var(--theme-text,#f7f8f8)]">
                          {step.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.command, idx)}
                        className="shrink-0 rounded-md border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-card,rgba(255,255,255,0.04))] px-2 py-0.5 text-[11px] font-medium text-[var(--theme-muted,#8a8f98)] transition hover:text-[var(--theme-text,#f7f8f8)] hover:bg-[var(--theme-card2)] cursor-pointer"
                      >
                        {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--theme-border,rgba(255,255,255,0.06))] bg-[var(--theme-bg,#08090a)] p-2.5 font-mono text-[11px] leading-5 text-[var(--theme-text,#f7f8f8)]">
                      <code>{step.command}</code>
                    </pre>
                    {step.note ? (
                      <p className="mt-1.5 text-[10.5px] text-[var(--theme-muted,#8a8f98)]">
                        {step.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Env var hint */}
              <div className="mt-3 rounded-xl border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-card2,rgba(255,255,255,0.03))] p-3">
                <p className="text-[11px] font-medium text-[var(--theme-muted,#8a8f98)]">
                  Point{' '}
                  <code className="rounded border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-card2)] px-1 py-0.5 font-mono text-[var(--theme-text,#f7f8f8)]">
                    HERMES_API_URL
                  </code>{' '}
                  at any OpenAI-compatible backend:
                </p>
                <pre className="mt-1.5 overflow-x-auto font-mono text-[10.5px] text-[var(--theme-muted,#8a8f98)]">
                  HERMES_API_URL=http://your-server:8642 pnpm dev
                </pre>
              </div>
            </div>
          </div>
        </div>

        {!showFailureState ? (
          <p className="mt-6 text-xs text-[var(--theme-muted,#8a8f98)]">
            This page auto-refreshes when a compatible backend is detected
          </p>
        ) : null}
      </div>
    </div>
  )
}
