'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from '@/components/ui/preview-card'

const POLL_MS = 15_000

type ContextData = {
  contextPercent: number
  model: string
  maxTokens: number
  usedTokens: number
}

const EMPTY: ContextData = {
  contextPercent: 0,
  model: '',
  maxTokens: 0,
  usedTokens: 0,
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function ContextBarComponent({
  compact: _compact,
  sessionId,
}: {
  compact?: boolean
  sessionId?: string
}) {
  const [ctx, setCtx] = useState<ContextData>(EMPTY)
  const [showLabel, setShowLabel] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const params = sessionId
        ? `?sessionId=${encodeURIComponent(sessionId)}`
        : ''
      const res = await fetch(`/api/context-usage${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.ok) {
        setCtx({
          contextPercent: data.contextPercent ?? 0,
          model: data.model ?? '',
          maxTokens: data.maxTokens ?? 0,
          usedTokens: data.usedTokens ?? 0,
        })
      }
    } catch {
      /* ignore */
    }
  }, [sessionId])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (!showLabel) return
    const id = setTimeout(() => setShowLabel(false), 3000)
    return () => clearTimeout(id)
  }, [showLabel])

  const pct = ctx.contextPercent
  const clampedPct = Math.min(Math.max(pct, 0), 100)

  // Hide only before any model/context info has loaded.
  if (ctx.maxTokens <= 0 && ctx.usedTokens <= 0 && !ctx.model) return null
  const isCritical = clampedPct > 90
  const isDanger = clampedPct >= 75 && clampedPct <= 90
  const isWarning = clampedPct >= 50 && clampedPct < 75

  const barColor = isCritical
    ? 'bg-rose-500'
    : isDanger
      ? 'bg-amber-500'
      : isWarning
        ? 'bg-amber-400'
        : 'bg-[var(--theme-accent,#5e6ad2)]'

  const barBg = 'bg-[var(--theme-border,rgba(255,255,255,0.08))]'

  const textColor = isCritical
    ? 'text-rose-500'
    : isDanger
      ? 'text-amber-500'
      : isWarning
        ? 'text-amber-400'
        : 'text-[var(--theme-accent-secondary,#7170ff)]'

  if (isMobile) {
    return (
      <div className="relative w-full">
        {/* Invisible tap target */}
        <button
          type="button"
          className="absolute inset-x-0 -top-2 -bottom-2 z-10"
          onClick={() => setShowLabel((prev) => !prev)}
          aria-label={`Context: ${Math.round(clampedPct)}% used`}
        />
        {/* Bar — sleek, thin, theme-aligned */}
        <div className={cn('w-full h-[2px]', barBg)}>
          <div
            className={cn(
              'h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(94,106,210,0.4)]',
              barColor,
            )}
            style={{ width: `${clampedPct}%` }}
          />
        </div>
        {/* Label floats below bar on tap */}
        {showLabel && (
          <div className="absolute right-2 top-[5px] z-20 flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-panel,#0d0e11)] shadow-xl animate-in fade-in duration-150">
            <span className="text-[10px] font-semibold tabular-nums text-white">
              {Math.round(clampedPct)}%
            </span>
            <span className="text-[9px] text-[var(--theme-muted,#8a8f98)] tabular-nums">
              {formatTokens(ctx.usedTokens)}/{formatTokens(ctx.maxTokens)}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <PreviewCard>
      <PreviewCardTrigger className="block w-full cursor-pointer">
        <div
          className={cn(
            'shrink-0 w-full h-[2.5px] transition-colors duration-300 relative',
            barBg,
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(94,106,210,0.3)]',
              barColor,
            )}
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      </PreviewCardTrigger>

      <PreviewCardPopup
        align="center"
        sideOffset={4}
        className="w-64 px-3.5 py-3 rounded-xl border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-panel,#0d0e11)] shadow-2xl backdrop-blur-md"
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-tight text-[var(--theme-text,#f7f8f8)]">
              Context Window
            </span>
            <span
              className={cn(
                'text-[11px] font-bold tabular-nums',
                textColor,
              )}
            >
              {Math.round(clampedPct)}%
            </span>
          </div>
          <div className={cn('w-full h-1.5 rounded-full overflow-hidden', barBg)}>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                barColor,
              )}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-[var(--theme-muted,#8a8f98)] tabular-nums font-mono">
              {formatTokens(ctx.usedTokens)} / {formatTokens(ctx.maxTokens)} tokens
            </span>
            {ctx.model && (
              <span className="text-[var(--theme-muted,#8a8f98)]/80 truncate max-w-[100px] font-mono text-[10px]">
                {ctx.model}
              </span>
            )}
          </div>
          {isCritical && (
            <p className="text-[10px] text-rose-500 font-medium">
              Context almost full — consider starting a new chat
            </p>
          )}
        </div>
      </PreviewCardPopup>
    </PreviewCard>
  )
}

export const ContextBar = memo(ContextBarComponent)
