import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert02Icon, Refresh01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from '@/components/ui/toast'

type Props = {
  feature: string
  description?: string
}

/**
 * Shown whenever a dashboard-backed feature (Skills, MCP, Memory, Jobs, ...)
 * reads as unavailable. Capability state is cached server-side for up to
 * PROBE_TTL_MS (2 min, see gateway-capabilities.ts) keyed off gateway health
 * — not dashboard health — so a dashboard that flaps up/down can leave this
 * screen stuck showing stale state well after the dashboard is actually back.
 *
 * The Retry button calls the existing (previously unwired) POST
 * /api/gateway-reprobe endpoint to force an immediate fresh check, then
 * invalidates the ['gateway-status'] query so useFeatureAvailable() picks up
 * the result right away instead of waiting for its own 60s poll interval.
 */
export function BackendUnavailableState({ feature, description }: Props) {
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    try {
      const res = await fetch('/api/gateway-reprobe', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Recheck failed')
      }
      await queryClient.invalidateQueries({ queryKey: ['gateway-status'] })
      if (data.capabilities?.dashboard?.available === false) {
        toast('Still no dashboard reachable — is `hermes dashboard` running?', {
          type: 'warning',
        })
      } else {
        toast('Rechecked backend capabilities', { type: 'success' })
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Recheck failed', {
        type: 'error',
      })
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex h-full min-h-[320px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-primary-200 bg-primary-50/70 p-8 text-center shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary-200 bg-white text-primary-600 shadow-sm">
          <HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={1.7} />
        </div>
        <div className="mt-4 space-y-2">
          <h2 className="text-lg font-semibold text-primary-900">{feature}</h2>
          <p className="text-sm leading-6 text-primary-600">
            Not available on this backend. Connect to a Hermes Agent gateway to unlock{' '}
            {feature}.
          </p>
          {description ? (
            <p className="text-xs leading-5 text-primary-500">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3.5 py-2 text-sm font-medium text-primary-700 transition-opacity hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            size={15}
            strokeWidth={1.75}
            className={retrying ? 'animate-spin' : undefined}
          />
          {retrying ? 'Checking…' : 'Retry'}
        </button>
      </div>
    </div>
  )
}

export default BackendUnavailableState
