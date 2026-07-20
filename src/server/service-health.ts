/**
 * Reachability checks for the System page's "Active Services" panel.
 *
 * Deliberately its own thing, not a reuse of gateway-capabilities.ts's
 * capability probing — that module caches results for up to 2 minutes
 * (keyed off gateway health, not the specific service being asked about),
 * which is exactly what made troubleshooting a flapping dashboard so
 * confusing earlier. This module re-checks fresh on every call; callers
 * control their own poll cadence instead.
 *
 * Gateway/Dashboard URLs are imported live from gateway-capabilities.ts
 * (not re-resolved from env here) so this panel can never disagree with
 * the URLs the rest of the app is actually using.
 */
import { CLAUDE_API, CLAUDE_DASHBOARD_URL } from './gateway-capabilities'
import { isProcessRunning } from './process-monitor'

export type ServiceStatus = {
  name: string
  status: 'up' | 'down'
  latencyMs: number | null
}

const CHECK_TIMEOUT_MS = 2000

function nineRouterUrl(): string {
  return process.env.NINE_ROUTER_URL?.trim() || 'http://127.0.0.1:20128'
}

/** Any HTTP response — even an error status — means the process is alive and answering. Only a network-level failure (refused, timed out) counts as down. */
async function checkHttpReachable(
  name: string,
  url: string,
): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await fetch(url, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })
    return { name, status: 'up', latencyMs: Date.now() - start }
  } catch {
    return { name, status: 'down', latencyMs: null }
  }
}

async function checkProcessRunning(
  name: string,
  processName: string,
): Promise<ServiceStatus> {
  const up = await isProcessRunning(processName)
  return { name, status: up ? 'up' : 'down', latencyMs: null }
}

export async function checkAllServices(): Promise<Array<ServiceStatus>> {
  const results = await Promise.all([
    checkHttpReachable('Hermes Gateway', `${CLAUDE_API}/health`),
    checkHttpReachable('Hermes Dashboard', `${CLAUDE_DASHBOARD_URL}/api/status`),
    checkHttpReachable('9router', nineRouterUrl()),
    checkProcessRunning('Caddy', 'caddy'),
  ])
  results.push({ name: 'Lam Cyberlab Workspace', status: 'up', latencyMs: 0 })
  return results
}
