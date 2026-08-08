import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolve4 } from 'node:dns/promises'
import { isPasswordProtectionEnabled } from './auth-middleware'

/**
 * Fitur 4 (Akses Publik) support code.
 *
 * Layer 1 — a UI-friendly wrapper around the fail-closed HOST/HERMES_PASSWORD
 * guard that already lives in server-entry.js and auth-middleware.ts. This
 * module owns reading/writing the workspace's own .env file so Settings →
 * Remote Access can persist changes without the user hand-editing a dotfile.
 *
 * HOST changes require a process restart to take effect (Node's
 * http.Server is bound once at startup) — this module never claims
 * otherwise. HERMES_PASSWORD changes take effect immediately because
 * auth-middleware reads process.env fresh on every request.
 *
 * Layer 3 — read-only helpers (domain validation, DNS lookup) backing the
 * "Custom Domain" panel. The actual Caddy install/reverse-proxy setup is
 * scripts/setup-remote-access.sh, run by the user in their own terminal —
 * this module never shells out or mutates system config.
 */

const MIN_PASSWORD_LENGTH = 8

// Resolved lazily (not at module load) so tests can process.chdir() into a
// throwaway directory and never touch the real repo .env, which holds live
// secrets (HERMES_API_TOKEN, provider keys, etc).
function getEnvPath(): string {
  return join(process.cwd(), '.env')
}

function readEnvFileRaw(): string {
  try {
    return readFileSync(getEnvPath(), 'utf8')
  } catch {
    return ''
  }
}

/** Read a single key's value from the .env file on disk (not process.env). */
export function readEnvFileValue(key: string): string | null {
  const raw = readEnvFileRaw()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq).trim() !== key) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return null
}

/**
 * Set (or replace) a key in the .env file, preserving every other line.
 * Mirrors install.sh's `ensure_env_key` bash helper so both paths produce
 * the same layout. Creates the file if it doesn't exist yet.
 */
export function writeEnvFileValue(key: string, value: string): void {
  const envPath = getEnvPath()
  const raw = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
  const lines = raw.length > 0 ? raw.split('\n') : []
  let found = false
  const next = lines.map((line) => {
    const trimmed = line.trim()
    if (!found && !trimmed.startsWith('#') && trimmed.startsWith(`${key}=`)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) {
    if (next.length > 0 && next[next.length - 1].trim() !== '') {
      next.push('')
    }
    next.push(`${key}=${value}`)
  }
  writeFileSync(envPath, next.join('\n'), { encoding: 'utf8', mode: 0o600 })
}

function isNonLoopbackHost(host: string): boolean {
  const norm = host.trim().toLowerCase()
  if (!norm) return false
  return norm !== '127.0.0.1' && norm !== '::1' && norm !== 'localhost'
}

export type RemoteAccessStatus = {
  /** HOST this process actually bound to at startup. */
  liveHost: string
  /** HOST currently written in .env on disk — may differ from liveHost. */
  diskHost: string
  /** liveHost is a non-loopback address (server is actually reachable remotely right now). */
  isExposedLive: boolean
  /** diskHost differs from liveHost — a restart is needed to apply the pending change. */
  requiresRestart: boolean
  port: number
  passwordConfigured: boolean
  cookieSecureExplicit: boolean
  trustProxyEnabled: boolean
  nodeEnv: string
  nineRouterExposed: boolean
}

export function getRemoteAccessStatus(): RemoteAccessStatus {
  const liveHost = process.env.HOST || '127.0.0.1'
  const diskHost = readEnvFileValue('HOST') || '127.0.0.1'
  const port = parseInt(process.env.PORT || '3000', 10)
  const cookieSecureOverride = (process.env.COOKIE_SECURE || '').trim().toLowerCase()
  const trustProxyValue = (process.env.TRUST_PROXY || '').trim().toLowerCase()

  return {
    liveHost,
    diskHost,
    isExposedLive: isNonLoopbackHost(liveHost),
    requiresRestart:
      isNonLoopbackHost(diskHost) !== isNonLoopbackHost(liveHost) ||
      diskHost.trim() !== liveHost.trim(),
    port: Number.isFinite(port) ? port : 3000,
    passwordConfigured: isPasswordProtectionEnabled(),
    cookieSecureExplicit: cookieSecureOverride === '1' || cookieSecureOverride === '0',
    trustProxyEnabled: trustProxyValue === '1' || trustProxyValue === 'true',
    nodeEnv: process.env.NODE_ENV || 'development',
    nineRouterExposed: isNonLoopbackHost(readEnvFileValue('NINE_ROUTER_HOST') || '127.0.0.1'),
  }
}

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Set the workspace password. Persists to .env AND applies to the running
 * process immediately (auth-middleware reads process.env.HERMES_PASSWORD on
 * every request, so this needs no restart).
 */
export function setWorkspacePassword(password: string): SetPasswordResult {
  const trimmed = password.trim()
  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }
  }
  writeEnvFileValue('HERMES_PASSWORD', trimmed)
  process.env.HERMES_PASSWORD = trimmed
  return { ok: true }
}

export type SetExposeResult =
  | { ok: true; requiresRestart: true }
  | { ok: false; error: string }

/**
 * Enable/disable remote exposure by writing HOST to .env. Cannot take
 * effect live — Node's http server is already bound — so callers must
 * surface "restart required" to the user.
 */
export function setExposeEnabled(enabled: boolean): SetExposeResult {
  if (enabled && !isPasswordProtectionEnabled()) {
    return {
      ok: false,
      error: 'Set a password before enabling remote access.',
    }
  }
  writeEnvFileValue('HOST', enabled ? '0.0.0.0' : '127.0.0.1')
  return { ok: true, requiresRestart: true }
}

export function setExpose9RouterEnabled(enabled: boolean): SetExposeResult {
  if (enabled && !isPasswordProtectionEnabled()) {
    return {
      ok: false,
      error: 'Set a password before enabling remote access.',
    }
  }
  writeEnvFileValue('NINE_ROUTER_HOST', enabled ? '0.0.0.0' : '127.0.0.1')
  return { ok: true, requiresRestart: true }
}

export type PublicIpResult =
  | { ok: true; ip: string }
  | { ok: false; error: string }

/**
 * Best-effort public IP lookup via a third-party echo service. User-triggered
 * only (never polled automatically) since it makes an outbound request to
 * api.ipify.org.
 */
export async function detectPublicIp(): Promise<PublicIpResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    })
    if (!res.ok) return { ok: false, error: `Lookup failed (HTTP ${res.status})` }
    const data = (await res.json()) as { ip?: string }
    if (!data.ip) return { ok: false, error: 'Lookup returned no IP' }
    return { ok: true, ip: data.ip }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Could not reach IP lookup service: ${message}` }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Loose but safe hostname validation for the custom-domain field: rejects
 * bare IPs, localhost, and anything that isn't a plausible DNS name.
 * ACME (Let's Encrypt) issuance needs a real domain anyway, so this just
 * catches obvious mistakes before the user copies the setup command.
 */
export function isValidDomain(input: string): boolean {
  const domain = input.trim().toLowerCase()
  if (!domain || domain.length > 253) return false
  if (domain === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false
  if (domain.includes(':')) return false // no IPv6 literals, no port suffixes
  const labelPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
  const labels = domain.split('.')
  if (labels.length < 2) return false
  return labels.every((label) => label.length > 0 && label.length <= 63 && labelPattern.test(label))
}

export type DomainDnsResult =
  | { ok: true; resolvedIps: Array<string>; matchesExpectedIp: boolean | null }
  | { ok: false; error: string }

/**
 * Resolve a domain's A records and (optionally) compare against the
 * server's known public IP. Read-only — never mutates anything, so it's
 * safe to call before the user has run the setup script at all.
 */
export async function checkDomainDns(
  domain: string,
  expectedIp?: string,
): Promise<DomainDnsResult> {
  if (!isValidDomain(domain)) {
    return { ok: false, error: 'Not a valid domain name.' }
  }
  try {
    const resolvedIps = await resolve4(domain)
    return {
      ok: true,
      resolvedIps,
      matchesExpectedIp: expectedIp ? resolvedIps.includes(expectedIp) : null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `DNS lookup failed: ${message}` }
  }
}
