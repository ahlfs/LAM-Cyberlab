import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Globe02Icon,
  GlobeIcon,
  LockIcon,
  Refresh01Icon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons'
import { toast } from '@/components/ui/toast'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Remote Access screen — Fitur 4 lapis 1 (PRD-workspace-additions.md).
 *
 * A UI wrapper around the fail-closed HOST/HERMES_PASSWORD guard that
 * already lives in server-entry.js and auth-middleware.ts — this page adds
 * no new security mechanism, it makes the existing one legible and safe to
 * operate. HOST changes require a process restart (Node's http.Server binds
 * once at startup); password changes apply immediately.
 */

type RemoteAccessStatus = {
  liveHost: string
  diskHost: string
  isExposedLive: boolean
  requiresRestart: boolean
  port: number
  passwordConfigured: boolean
  cookieSecureExplicit: boolean
  trustProxyEnabled: boolean
  nodeEnv: string
}

function Panel({
  title,
  icon,
  headerRight,
  children,
}: {
  title: string
  icon: Parameters<typeof HugeiconsIcon>[0]['icon']
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{
        background:
          'linear-gradient(150deg, color-mix(in srgb, var(--theme-card) 96%, transparent), color-mix(in srgb, var(--theme-card) 92%, transparent))',
        borderColor: 'var(--theme-border)',
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={icon} size={13} style={{ color: 'var(--theme-muted)' }} />
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--theme-text)' }}
          >
            {title}
          </h2>
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  )
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  )
}

async function fetchStatus(): Promise<RemoteAccessStatus> {
  const res = await fetch('/api/remote-access/status')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function RemoteAccessScreen() {
  const queryClient = useQueryClient()
  const statusQuery = useQuery({
    queryKey: ['remote-access-status'],
    queryFn: fetchStatus,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  })
  const status = statusQuery.data ?? null

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [publicIp, setPublicIp] = useState<string | null>(null)
  const [checkingIp, setCheckingIp] = useState(false)
  const [ipError, setIpError] = useState<string | null>(null)

  const [domain, setDomain] = useState('')
  const [checkingDns, setCheckingDns] = useState(false)
  const [dnsResult, setDnsResult] = useState<{
    resolvedIps?: Array<string>
    matchesExpectedIp?: boolean | null
    error?: string
  } | null>(null)

  const exposeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch('/api/remote-access/expose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      return data
    },
    onSuccess: (_data, enabled) => {
      toast(
        enabled
          ? 'Expose to internet enabled — restart the server to apply'
          : 'Expose to internet disabled — restart the server to apply',
        { type: enabled ? 'warning' : 'success' },
      )
      void queryClient.invalidateQueries({ queryKey: ['remote-access-status'] })
    },
    onError: (err: Error) => toast(err.message, { type: 'error' }),
  })

  async function handleSavePassword() {
    if (password.length < 8) {
      toast('Password must be at least 8 characters.', { type: 'error' })
      return
    }
    if (password !== confirmPassword) {
      toast("Passwords don't match.", { type: 'error' })
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/remote-access/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save password')
      toast('Password saved — applied immediately, no restart needed.', {
        type: 'success',
      })
      setPassword('')
      setConfirmPassword('')
      void queryClient.invalidateQueries({ queryKey: ['remote-access-status'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save password', {
        type: 'error',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleCheckPublicIp() {
    setCheckingIp(true)
    setIpError(null)
    try {
      const res = await fetch('/api/remote-access/public-ip')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setPublicIp(data.ip)
    } catch (err) {
      setIpError(err instanceof Error ? err.message : 'Lookup failed')
      setPublicIp(null)
    } finally {
      setCheckingIp(false)
    }
  }

  async function handleCheckDns() {
    if (!domain.trim()) return
    setCheckingDns(true)
    setDnsResult(null)
    try {
      const params = new URLSearchParams({ domain: domain.trim() })
      if (publicIp) params.set('expectedIp', publicIp)
      const res = await fetch(`/api/remote-access/check-domain?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check failed')
      setDnsResult(data)
    } catch (err) {
      setDnsResult({ error: err instanceof Error ? err.message : 'Check failed' })
    } finally {
      setCheckingDns(false)
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(
      () => toast('Copied', { type: 'success' }),
      () => toast('Could not copy', { type: 'error' }),
    )
  }

  const passwordConfigured = status?.passwordConfigured ?? false
  const isExposedLive = status?.isExposedLive ?? false
  const requiresRestart = status?.requiresRestart ?? false
  const diskExposed = status ? status.diskHost.trim() !== '127.0.0.1' : false
  const bindColor = isExposedLive ? 'var(--theme-warning)' : 'var(--theme-success)'
  const testUrl = publicIp && status ? `http://${publicIp}:${status.port}` : null

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-3 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        <header
          className="rounded-2xl border p-4"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'color-mix(in srgb, var(--theme-panel) 85%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={GlobeIcon} size={18} className="text-[var(--theme-accent)]" />
            <h1 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
              Remote Access
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-muted)' }}>
            Reach this workspace from the internet — a public VPS IP, or your own domain
            later. Off by default; nothing here changes how <code>pnpm dev</code> behaves
            locally.
          </p>
        </header>

        {/* ── Bind status ─────────────────────────────────────────────── */}
        <Panel
          title="Status"
          icon={Wifi01Icon}
          headerRight={
            status ? (
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: 'var(--theme-muted)' }}
              >
                port {status.port} · {status.nodeEnv}
              </span>
            ) : null
          }
        >
          {statusQuery.isLoading ? (
            <div
              className="h-12 animate-pulse rounded-lg"
              style={{ background: 'var(--theme-border)' }}
            />
          ) : status ? (
            <>
              <div className="flex items-center gap-2">
                <StatusDot color={bindColor} />
                <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                  {isExposedLive
                    ? 'Exposed — reachable beyond this machine'
                    : 'Local only — reachable from this machine only'}
                </span>
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  ({status.liveHost})
                </span>
              </div>
              {requiresRestart ? (
                <div
                  className="flex items-start gap-2 rounded-lg border p-2.5 text-xs"
                  style={{
                    borderColor: 'var(--theme-warning)',
                    background: 'color-mix(in srgb, var(--theme-warning) 12%, transparent)',
                    color: 'var(--theme-text)',
                  }}
                >
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--theme-warning)' }}
                  />
                  <span>
                    Pending change: this will become{' '}
                    <strong>{diskExposed ? 'exposed (0.0.0.0)' : 'local only (127.0.0.1)'}</strong>{' '}
                    on the next restart. Stop and re-run <code>pnpm start</code> (or restart
                    your systemd/Docker service) to apply it.
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--theme-danger)' }}>
              Couldn't load status.
            </p>
          )}
        </Panel>

        {/* ── Password ────────────────────────────────────────────────── */}
        <Panel title="Password" icon={LockIcon}>
          <div className="flex items-center gap-2">
            <StatusDot color={passwordConfigured ? 'var(--theme-success)' : 'var(--theme-muted)'} />
            <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {passwordConfigured ? 'Password is set' : 'No password set yet'}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="New password"
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-label="Confirm password"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSavePassword}
              disabled={savingPassword || !password || !confirmPassword}
            >
              {passwordConfigured ? 'Update password' : 'Set password'}
            </Button>
            <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              Applies immediately — no restart needed.
            </span>
          </div>
        </Panel>

        {/* ── Expose toggle ───────────────────────────────────────────── */}
        <Panel title="Expose to internet" icon={GlobeIcon}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                Bind to 0.0.0.0
              </p>
              <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                {passwordConfigured
                  ? 'Combine with an open firewall port on your VPS to reach this workspace publicly.'
                  : 'Set a password above first — this stays off until you do.'}
              </p>
            </div>
            <Switch
              checked={diskExposed}
              disabled={!passwordConfigured || exposeMutation.isPending}
              onCheckedChange={(checked) => exposeMutation.mutate(checked)}
              aria-label="Expose to internet"
            />
          </div>
        </Panel>

        {/* ── Reachability ────────────────────────────────────────────── */}
        <Panel title="Reachability" icon={CheckmarkCircle02Icon}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckPublicIp}
              disabled={checkingIp}
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                size={14}
                className={checkingIp ? 'animate-spin' : undefined}
              />
              Check public IP
            </Button>
            {publicIp ? (
              <span
                className="font-mono text-sm tabular-nums"
                style={{ color: 'var(--theme-text)' }}
              >
                {publicIp}
              </span>
            ) : ipError ? (
              <span className="text-xs" style={{ color: 'var(--theme-danger)' }}>
                {ipError}
              </span>
            ) : null}
          </div>

          {testUrl ? (
            <div
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <code className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--theme-text)' }}>
                {testUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText(testUrl)}
                className="shrink-0 rounded p-1 hover:bg-[var(--theme-card2)]"
                aria-label="Copy test URL"
              >
                <HugeiconsIcon icon={Copy01Icon} size={13} style={{ color: 'var(--theme-muted)' }} />
              </button>
            </div>
          ) : null}

          <ol className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--theme-muted)' }}>
            <li>1. Set a password above, then turn on "Expose to internet".</li>
            <li>2. Restart the workspace process so the new bind address takes effect.</li>
            <li>
              3. Open port {status?.port ?? 3000} in your VPS firewall or cloud security group
              (e.g. <code>ufw allow {status?.port ?? 3000}</code>).
            </li>
            <li>4. Check your public IP above, then test the URL from another network.</li>
          </ol>
        </Panel>

        {/* ── Custom domain (Caddy) ───────────────────────────────────── */}
        <Panel title="Custom Domain" icon={Globe02Icon}>
          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
            Puts Caddy in front of the workspace for a real domain with automatic
            HTTPS. The workspace itself can stay on <code>127.0.0.1</code> — only
            Caddy needs to face the internet, so you don't need "Expose to
            internet" above for this path.
          </p>

          <div className="min-w-0 flex-1">
            {!passwordConfigured ? (
              <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                Set a password above first.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="yourdomain.com"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value)
                setDnsResult(null)
              }}
              disabled={!passwordConfigured}
              aria-label="Custom domain"
              className="max-w-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckDns}
              disabled={!passwordConfigured || !domain.trim() || checkingDns}
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                size={14}
                className={checkingDns ? 'animate-spin' : undefined}
              />
              Check DNS
            </Button>
          </div>

          {dnsResult ? (
            dnsResult.error ? (
              <span className="text-xs" style={{ color: 'var(--theme-danger)' }}>
                {dnsResult.error}
              </span>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <StatusDot
                  color={
                    dnsResult.matchesExpectedIp
                      ? 'var(--theme-success)'
                      : 'var(--theme-warning)'
                  }
                />
                <span style={{ color: 'var(--theme-text)' }}>
                  {dnsResult.matchesExpectedIp
                    ? 'Points to this server'
                    : `Resolves to ${dnsResult.resolvedIps?.join(', ')}${publicIp ? ` (this server is ${publicIp})` : ''}`}
                </span>
              </div>
            )
          ) : null}

          {domain.trim() && passwordConfigured ? (
            <div
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <code
                className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs"
                style={{ color: 'var(--theme-text)' }}
              >
                sudo ./scripts/setup-remote-access.sh --domain {domain.trim()} --port{' '}
                {status?.port ?? 3000}
              </code>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `sudo ./scripts/setup-remote-access.sh --domain ${domain.trim()} --port ${status?.port ?? 3000}`,
                  )
                }
                className="shrink-0 rounded p-1 hover:bg-[var(--theme-card2)]"
                aria-label="Copy setup command"
              >
                <HugeiconsIcon icon={Copy01Icon} size={13} style={{ color: 'var(--theme-muted)' }} />
              </button>
            </div>
          ) : null}

          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
            Run this yourself in a terminal on the server — it installs Caddy if
            needed and needs root. The workspace never runs system setup
            commands on its own.
          </p>
        </Panel>
      </div>
    </div>
  )
}
