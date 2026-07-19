import { useId, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { CpuIcon } from '@hugeicons/core-free-icons'
import type { SystemStats } from '@/server/system-stats'
import { formatUptime } from '@/screens/dashboard/lib/formatters'

/**
 * System screen — the detailed host monitor (PRD #2 phase 2).
 * CasaOS-grade coverage in the house instrument vocabulary: overall +
 * per-core CPU with history, memory broken into used/cached/free,
 * per-mount storage, and per-interface network with live rate charts.
 *
 * Polls /api/system-stats every POLL_MS while visible (react-query
 * pauses hidden tabs); history buffers live client-side so the page
 * carries ~5 minutes of context without any server persistence.
 */

const POLL_MS = 2000
const HISTORY_CAP = 150 // ~5 min at POLL_MS
const MAX_IFACE_ROWS = 6

const WARN_PCT = 85
const CRIT_PCT = 95
const WARN_TEMP_C = 80

function statusColor(pct: number): string {
  if (pct >= CRIT_PCT) return 'var(--theme-danger)'
  if (pct >= WARN_PCT) return 'var(--theme-warning)'
  return 'color-mix(in srgb, var(--theme-text) 45%, transparent)'
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(0, Math.round(bytes / 1024))} KB`
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 ** 2)
    return `${(bytesPerSec / 1024 ** 2).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${Math.round(bytesPerSec / 1024)} KB/s`
  return `${Math.max(0, Math.round(bytesPerSec))} B/s`
}

/* ── Shared panel chrome ─────────────────────────────────────────────── */

function Panel({
  title,
  headerRight,
  children,
  className,
}: {
  title: string
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border p-4 ${className ?? ''}`}
      style={{
        background:
          'linear-gradient(150deg, color-mix(in srgb, var(--theme-card) 96%, transparent), color-mix(in srgb, var(--theme-card) 92%, transparent))',
        borderColor: 'var(--theme-border)',
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--theme-text)' }}
        >
          {title}
        </h2>
        {headerRight}
      </div>
      {children}
    </section>
  )
}

/* ── Network traffic chart ───────────────────────────────────────────── */
//
// Redesigned for clarity (owner reported confusion about what the old
// two-line chart was showing): a filled area per direction so "more area
// filled = more throughput" reads at a glance, a legend that's on-screen at
// all times (not just discoverable on hover), a real 0-baseline with two
// scale gridlines, and download vs. upload using genuinely different colors
// (accent vs. ink) instead of accent vs. a faint muted tone that read as
// "barely there."

const DOWNLOAD_COLOR = 'var(--theme-accent)'
const UPLOAD_COLOR = 'color-mix(in srgb, var(--theme-text) 70%, transparent)'

function NetworkTrafficChart({
  history,
  currentRx,
  currentTx,
}: {
  history: Array<{ rx: number; tx: number }>
  currentRx: number
  currentTx: number
}) {
  const [cursor, setCursor] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const gradientId = useId()
  const len = history.length
  const max = Math.max(1, ...history.flatMap((p) => [p.rx, p.tx])) * 1.15

  const VIEW_H = 30

  function toPath(points: Array<number>, close: boolean): string {
    if (len < 2) return ''
    const line = points
      .map((v, i) => {
        const x = (i / (len - 1)) * 100
        const y = VIEW_H - (v / max) * (VIEW_H - 1)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
    return close ? `${line} L100,${VIEW_H} L0,${VIEW_H} Z` : line
  }

  const rxPoints = history.map((p) => p.rx)
  const txPoints = history.map((p) => p.tx)
  const cursorX = cursor !== null && len > 1 ? (cursor / (len - 1)) * 100 : null

  const gridSteps = [0.5, 1]

  return (
    <div className="flex flex-col gap-1.5">
      {/* Always-visible legend — this is what was missing before: it's no
          longer necessary to hover the chart to know which line is which. */}
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums"
          style={{ color: 'var(--theme-text)' }}
        >
          <i aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: DOWNLOAD_COLOR }} />
          Download <span style={{ color: 'var(--theme-muted)' }}>{formatRate(currentRx)}</span>
        </span>
        <span
          className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums"
          style={{ color: 'var(--theme-text)' }}
        >
          <i aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: UPLOAD_COLOR }} />
          Upload <span style={{ color: 'var(--theme-muted)' }}>{formatRate(currentTx)}</span>
        </span>
      </div>

      <div
        ref={boxRef}
        className="relative h-24 w-full select-none"
        onPointerMove={(e) => {
          if (len < 2 || !boxRef.current) return
          const rect = boxRef.current.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          setCursor(Math.min(len - 1, Math.max(0, Math.round(ratio * (len - 1)))))
        }}
        onPointerLeave={() => setCursor(null)}
      >
        {len >= 2 ? (
          <svg
            aria-hidden
            className="h-full w-full"
            viewBox={`0 0 100 ${VIEW_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`${gradientId}-rx`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOWNLOAD_COLOR} stopOpacity="0.28" />
                <stop offset="100%" stopColor={DOWNLOAD_COLOR} stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gradientId}-tx`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UPLOAD_COLOR} stopOpacity="0.22" />
                <stop offset="100%" stopColor={UPLOAD_COLOR} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Scale gridlines — a 0-baseline and two rate reference lines,
                so the chart is readable without hovering. */}
            {gridSteps.map((frac) => (
              <line
                key={frac}
                x1={0}
                x2={100}
                y1={VIEW_H - frac * (VIEW_H - 1)}
                y2={VIEW_H - frac * (VIEW_H - 1)}
                stroke="color-mix(in srgb, var(--theme-border) 55%, transparent)"
                strokeWidth={0.4}
                strokeDasharray="2,2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={0}
              x2={100}
              y1={VIEW_H}
              y2={VIEW_H}
              stroke="color-mix(in srgb, var(--theme-border) 70%, transparent)"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />

            <path d={toPath(rxPoints, true)} fill={`url(#${gradientId}-rx)`} stroke="none" />
            <path d={toPath(txPoints, true)} fill={`url(#${gradientId}-tx)`} stroke="none" />
            <path
              d={toPath(rxPoints, false)}
              fill="none"
              stroke={DOWNLOAD_COLOR}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={toPath(txPoints, false)}
              fill="none"
              stroke={UPLOAD_COLOR}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {cursorX !== null ? (
              <line
                x1={cursorX}
                x2={cursorX}
                y1={0}
                y2={VIEW_H}
                stroke="color-mix(in srgb, var(--theme-text) 35%, transparent)"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        ) : (
          <div
            aria-hidden
            className="h-full w-full rounded"
            style={{ background: 'color-mix(in srgb, var(--theme-border) 25%, transparent)' }}
          />
        )}

        {/* Scale labels for the gridlines — placed outside the (stretched,
            non-uniform-scaled) SVG so the text itself never distorts. */}
        {len >= 2 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1 top-0 flex h-full flex-col justify-between py-0.5 font-mono text-[8px] tabular-nums"
            style={{ color: 'var(--theme-muted)' }}
          >
            <span>{formatRate(max / 1.15)}</span>
            <span>0</span>
          </div>
        ) : null}

        <span
          className="pointer-events-none absolute right-1 top-0.5 font-mono text-[9px] tabular-nums"
          style={{ color: 'var(--theme-muted)' }}
        >
          {cursor !== null && len >= 2
            ? `↓ ${formatRate(rxPoints[cursor])} · ↑ ${formatRate(txPoints[cursor])}`
            : 'last 5 min'}
        </span>
      </div>
    </div>
  )
}

/* ── Circular gauge (CasaOS-style ring) ──────────────────────────────── */

/** Green below half, yellow from half, red from 90% — matches the CasaOS reading. */
function gaugeColor(pct: number): string {
  if (pct >= 90) return 'var(--theme-danger)'
  if (pct >= 50) return 'var(--theme-warning)'
  return 'var(--theme-success)'
}

function CircularGauge({
  pct,
  label,
  size = 108,
  strokeWidth = 10,
}: {
  pct: number
  label: string
  size?: number
  strokeWidth?: number
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const color = gaugeColor(clamped)

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--theme-border) 45%, transparent)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset,stroke] motion-safe:duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="font-mono text-xl font-bold tabular-nums leading-none"
          style={{ color: 'var(--theme-text)' }}
        >
          {Math.round(clamped)}
          <span className="text-xs font-semibold">%</span>
        </span>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.12em]"
          style={{ color: 'var(--theme-muted)' }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

/* ── Panels ──────────────────────────────────────────────────────────── */

function CpuPanel({ stats }: { stats: SystemStats }) {
  const cpu = stats.cpu
  if (!cpu) return null
  return (
    <Panel
      title="CPU"
      className="lg:col-span-2"
      headerRight={
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--theme-muted)' }}
        >
          load {stats.loadAvg.map((l) => l.toFixed(2)).join(' · ')}
          {stats.procs ? ` · ${stats.procs.total} procs` : ''}
        </span>
      }
    >
      <div className="flex items-center gap-4">
        <CircularGauge pct={cpu.pct} label="CPU" />
        <div className="flex flex-col gap-1.5">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            {cpu.perCorePct.length} cores
          </span>
          {stats.tempC != null ? (
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{
                color:
                  stats.tempC >= WARN_TEMP_C
                    ? 'var(--theme-warning)'
                    : 'var(--theme-muted)',
              }}
            >
              {Math.round(stats.tempC)}°C
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="grid gap-x-3 gap-y-1.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
      >
        {cpu.perCorePct.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-5 shrink-0 font-mono text-[9px] tabular-nums"
              style={{ color: 'var(--theme-muted)' }}
            >
              {i}
            </span>
            <div
              aria-hidden
              className="h-1 flex-1 overflow-hidden rounded-full"
              style={{
                background:
                  'color-mix(in srgb, var(--theme-border) 50%, transparent)',
              }}
            >
              <div
                className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
                style={{
                  width: `${Math.max(2, p)}%`,
                  background: statusColor(p),
                }}
              />
            </div>
            <span
              className="w-7 shrink-0 text-right font-mono text-[9px] tabular-nums"
              style={{ color: 'var(--theme-text)' }}
            >
              {Math.round(p)}%
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function MemoryPanel({ stats }: { stats: SystemStats }) {
  const mem = stats.memory
  if (!mem) return null
  const appBytes = Math.max(0, mem.usedBytes)
  const cachedBytes = Math.max(0, mem.cachedBytes)
  const freeBytes = Math.max(0, mem.totalBytes - appBytes - cachedBytes)
  const segs = [
    { label: 'Used', bytes: appBytes, color: gaugeColor(mem.pct) },
    {
      label: 'Cached',
      bytes: cachedBytes,
      color: 'color-mix(in srgb, var(--theme-text) 22%, transparent)',
    },
    {
      label: 'Free',
      bytes: freeBytes,
      color: 'color-mix(in srgb, var(--theme-border) 45%, transparent)',
    },
  ]
  return (
    <Panel
      title="Memory"
      headerRight={
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--theme-muted)' }}
        >
          of {formatBytes(mem.totalBytes)}
        </span>
      }
    >
      <div className="flex items-center gap-4">
        <CircularGauge pct={mem.pct} label="RAM" />
        <div className="flex flex-col gap-1">
          {segs.map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums"
              style={{ color: 'var(--theme-text)' }}
            >
              <i
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              {s.label} {formatBytes(s.bytes)}
            </span>
          ))}
        </div>
      </div>
      {stats.swap ? (
        <div className="flex items-center gap-2">
          <span
            className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            Swap
          </span>
          <div
            aria-hidden
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{
              background:
                'color-mix(in srgb, var(--theme-border) 50%, transparent)',
            }}
          >
            <div
              className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
              style={{
                width: `${Math.max(1, stats.swap.pct)}%`,
                background: statusColor(stats.swap.pct),
              }}
            />
          </div>
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--theme-muted)' }}
          >
            {formatBytes(stats.swap.usedBytes)} /{' '}
            {formatBytes(stats.swap.totalBytes)}
          </span>
        </div>
      ) : null}
    </Panel>
  )
}

function StoragePanel({ stats }: { stats: SystemStats }) {
  const disks = stats.disks
  if (!disks || disks.length === 0) return null
  return (
    <Panel
      title="Storage"
      headerRight={
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--theme-muted)' }}
        >
          {disks.length} volume{disks.length > 1 ? 's' : ''}
        </span>
      }
    >
      <ul className="flex flex-col gap-3">
        {disks.map((d) => {
          const freeBytes = Math.max(0, d.totalBytes - d.usedBytes)
          return (
            <li key={d.mount} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate font-mono text-[11px]"
                  style={{ color: 'var(--theme-text)' }}
                  title={`${d.mount} (${d.fsType})`}
                >
                  {d.mount}{' '}
                  <span
                    className="text-[9px] uppercase"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    {d.fsType}
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono text-[10px] tabular-nums"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  <span style={{ color: 'var(--theme-text)' }}>
                    {Math.round(d.pct)}%
                  </span>{' '}
                  · {formatBytes(d.usedBytes)} / {formatBytes(d.totalBytes)} ·{' '}
                  {formatBytes(freeBytes)} free
                </span>
              </div>
              <div
                aria-hidden
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{
                  background:
                    'color-mix(in srgb, var(--theme-border) 50%, transparent)',
                }}
              >
                <div
                  className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
                  style={{
                    width: `${Math.max(1, d.pct)}%`,
                    background: statusColor(d.pct),
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function NetworkPanel({
  stats,
  history,
}: {
  stats: SystemStats
  history: Array<{ rx: number; tx: number }>
}) {
  const net = stats.network
  if (!net) return null
  const ifaces = net.interfaces.slice(0, MAX_IFACE_ROWS)
  return (
    <Panel
      title="Network"
      className="lg:col-span-2"
      headerRight={
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--theme-muted)' }}
        >
          {ifaces.length} interface{ifaces.length === 1 ? '' : 's'}
        </span>
      }
    >
      <NetworkTrafficChart
        history={history}
        currentRx={net.rxBytesPerSec}
        currentTx={net.txBytesPerSec}
      />
      {ifaces.length > 0 ? (
        <ul
          className="grid gap-x-6 gap-y-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}
        >
          {ifaces.map((i) => (
            <li
              key={i.name}
              className="flex items-baseline justify-between gap-2 font-mono text-[10px] tabular-nums"
            >
              <span className="truncate" style={{ color: 'var(--theme-text)' }}>
                {i.name}
              </span>
              <span style={{ color: 'var(--theme-muted)' }}>
                ↓ {formatRate(i.rxBytesPerSec)} · ↑ {formatRate(i.txBytesPerSec)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}

/* ── Screen ──────────────────────────────────────────────────────────── */

export function SystemScreen() {
  const query = useQuery<SystemStats>({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const res = await fetch('/api/system-stats', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<SystemStats>
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000,
  })

  const stats = query.data ?? null
  const unreachable = query.isError

  const netHistoryRef = useRef<Array<{ at: number; rx: number; tx: number }>>(
    [],
  )
  // useMemo keyed on sampledAt: append exactly once per fresh sample,
  // synchronously, so charts never lag a render behind the numbers.
  useMemo(() => {
    if (!stats) return
    if (stats.network) {
      const buf = netHistoryRef.current
      if (buf.length === 0 || buf[buf.length - 1].at !== stats.sampledAt) {
        buf.push({
          at: stats.sampledAt,
          rx: stats.network.rxBytesPerSec,
          tx: stats.network.txBytesPerSec,
        })
        if (buf.length > HISTORY_CAP) buf.splice(0, buf.length - HISTORY_CAP)
      }
    }
  }, [stats])

  const lamp = unreachable ? 'var(--theme-danger)' : 'var(--theme-success)'

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        <header
          className="rounded-2xl border p-4"
          style={{
            borderColor: 'var(--theme-border)',
            background:
              'color-mix(in srgb, var(--theme-panel) 85%, transparent)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CpuIcon}
                size={18}
                className="text-[var(--theme-accent)]"
              />
              <h1
                className="text-base font-semibold"
                style={{ color: 'var(--theme-text)' }}
              >
                System
              </h1>
            </div>
            <span
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{
                color: unreachable
                  ? 'var(--theme-danger)'
                  : 'var(--theme-muted)',
              }}
            >
              <i
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: lamp }}
              />
              {unreachable
                ? 'unreachable · retrying'
                : stats
                  ? `${stats.hostname} · ${stats.platform} · up ${formatUptime(stats.uptimeSec)}`
                  : 'connecting…'}
            </span>
          </div>
        </header>

        {stats ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CpuPanel stats={stats} />
            <MemoryPanel stats={stats} />
            <StoragePanel stats={stats} />
            <NetworkPanel stats={stats} history={netHistoryRef.current} />
          </div>
        ) : unreachable ? (
          <div
            className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span
              className="font-mono text-[12px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--theme-muted)' }}
            >
              host stats unreachable
            </span>
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--theme-muted)' }}
            >
              retrying every {POLL_MS / 1000}s — check that the workspace
              server is running
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-40 rounded-xl border motion-safe:animate-pulse ${
                  i === 0 || i === 3 ? 'lg:col-span-2' : ''
                }`}
                style={{
                  borderColor: 'var(--theme-border)',
                  background:
                    'color-mix(in srgb, var(--theme-card) 60%, transparent)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
