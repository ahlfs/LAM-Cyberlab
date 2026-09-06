const ACTIVE_RUN_CONTROLLERS_KEY = '__claude_active_run_controllers__' as const
const ACTIVE_RUNS_KEY = '__claude_active_send_runs__' as const

type ActiveControllerMap = Map<string, { abortController: AbortController; sessionKey: string }>

function getActiveRuns(): Set<string> {
  const globalValue = globalThis as typeof globalThis & {
    [ACTIVE_RUNS_KEY]?: Set<string>
  }
  if (!globalValue[ACTIVE_RUNS_KEY]) {
    globalValue[ACTIVE_RUNS_KEY] = new Set<string>()
  }
  return globalValue[ACTIVE_RUNS_KEY]
}

function getActiveControllers(): ActiveControllerMap {
  const globalValue = globalThis as typeof globalThis & {
    [ACTIVE_RUN_CONTROLLERS_KEY]?: ActiveControllerMap
  }
  if (!globalValue[ACTIVE_RUN_CONTROLLERS_KEY]) {
    globalValue[ACTIVE_RUN_CONTROLLERS_KEY] = new Map()
  }
  return globalValue[ACTIVE_RUN_CONTROLLERS_KEY]
}

export function registerActiveSendRun(
  runId: string,
  sessionKey?: string,
  abortController?: AbortController,
): void {
  if (!runId) return
  getActiveRuns().add(runId)
  if (abortController && sessionKey) {
    getActiveControllers().set(runId, { abortController, sessionKey })
  }
}

export function unregisterActiveSendRun(runId: string): void {
  if (!runId) return
  getActiveRuns().delete(runId)
  getActiveControllers().delete(runId)
}

export function hasActiveSendRun(runId: string | null | undefined): boolean {
  if (!runId) return false
  return getActiveRuns().has(runId)
}

export function stopActiveRun(runIdOrSessionKey: string): boolean {
  if (!runIdOrSessionKey) return false
  const controllers = getActiveControllers()

  // Match by runId
  if (controllers.has(runIdOrSessionKey)) {
    const entry = controllers.get(runIdOrSessionKey)
    entry?.abortController.abort()
    unregisterActiveSendRun(runIdOrSessionKey)
    return true
  }

  // Match by sessionKey
  let stopped = false
  for (const [runId, entry] of Array.from(controllers.entries())) {
    if (entry.sessionKey === runIdOrSessionKey) {
      entry.abortController.abort()
      unregisterActiveSendRun(runId)
      stopped = true
    }
  }
  return stopped
}
