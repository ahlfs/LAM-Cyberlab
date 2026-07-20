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
// Services/processes poll slower than CPU/RAM: a service check makes real
// network calls and a process scan reads every /proc/pid dir, so checking
// every 2s the way CPU/RAM does would be wasteful for data that a human is
// just glancing at to catch something being down.
const POLL_MS_SLOW = 5000
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
      {stats.diskIo && stats.diskIo.length > 0 ? (
        <div
          className="flex flex-col gap-1.5 border-t pt-2.5"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <span
            className="font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            I/O
          </span>
          <ul className="flex flex-col gap-1">
            {stats.diskIo.map((d) => (
              <li
                key={d.device}
                className="flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums"
              >
                <span style={{ color: 'var(--theme-text)' }}>{d.device}</span>
                <span style={{ color: 'var(--theme-muted)' }}>
                  ↓ {formatRate(d.readBytesPerSec)} · ↑{' '}
                  {formatRate(d.writeBytesPerSec)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  )
}

/* ── Active Services ─────────────────────────────────────────────────── */

type ServiceStatusData = {
  name: string
  status: 'up' | 'down'
  latencyMs: number | null
}

function ServicesPanel() {
  const query = useQuery<{ services: Array<ServiceStatusData> }>({
    queryKey: ['system-services'],
    queryFn: async () => {
      const res = await fetch('/api/system-services', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: POLL_MS_SLOW,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 2000,
  })

  const services = query.data?.services ?? []
  const downCount = services.filter((s) => s.status === 'down').length

  return (
    <Panel
      title="Active Services"
      headerRight={
        services.length > 0 ? (
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{
              color:
                downCount > 0 ? 'var(--theme-danger)' : 'var(--theme-muted)',
            }}
          >
            {downCount > 0
              ? `${downCount} down`
              : `${services.length} up`}
          </span>
        ) : null
      }
    >
      {query.isLoading ? (
        <div
          className="h-24 animate-pulse rounded-lg"
          style={{ background: 'var(--theme-border)' }}
        />
      ) : query.isError ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-danger)' }}>
          Couldn't check services — the workspace itself may be unreachable.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {services.map((s) => {
            const up = s.status === 'up'
            const dotColor = up ? 'var(--theme-success)' : 'var(--theme-danger)'
            return (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span
                  className="flex min-w-0 items-center gap-2 text-[11px]"
                  style={{ color: 'var(--theme-text)' }}
                >
                  <i
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: dotColor,
                      boxShadow: up ? 'none' : `0 0 6px ${dotColor}`,
                    }}
                  />
                  <span className="truncate">{s.name}</span>
                </span>
                <span
                  className="shrink-0 font-mono text-[10px] uppercase tabular-nums tracking-[0.06em]"
                  style={{ color: up ? 'var(--theme-muted)' : 'var(--theme-danger)' }}
                >
                  {up
                    ? s.latencyMs != null && s.latencyMs > 0
                      ? `${s.latencyMs}ms`
                      : 'up'
                    : 'down'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ── Top Processes ───────────────────────────────────────────────────── */

type ProcessInfoData = {
  pid: number
  name: string
  cpuPct: number
  rssBytes: number
}

function ProcessesPanel() {
  const query = useQuery<{ processes: Array<ProcessInfoData> }>({
    queryKey: ['system-processes'],
    queryFn: async () => {
      const res = await fetch('/api/system-processes', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: POLL_MS_SLOW,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 2000,
  })

  const processes = query.data?.processes ?? []

  return (
    <Panel
      title="Top Processes"
      headerRight={
        <span
          className="font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color: 'var(--theme-muted)' }}
        >
          by CPU
        </span>
      }
    >
      {query.isLoading ? (
        <div
          className="h-32 animate-pulse rounded-lg"
          style={{ background: 'var(--theme-border)' }}
        />
      ) : query.isError ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-danger)' }}>
          Couldn't read process list.
        </p>
      ) : processes.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-muted)' }}>
          No process data available on this host.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {processes.map((p) => (
            <li key={p.pid} className="flex items-center gap-2">
              <span
                className="w-10 shrink-0 font-mono text-[9px] tabular-nums"
                style={{ color: 'var(--theme-muted)' }}
              >
                {p.pid}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-mono text-[11px]"
                style={{ color: 'var(--theme-text)' }}
                title={p.name}
              >
                {p.name}
              </span>
              <span
                className="w-11 shrink-0 text-right font-mono text-[10px] tabular-nums"
                style={{ color: gaugeColor(p.cpuPct) }}
              >
                {p.cpuPct.toFixed(1)}%
              </span>
              <span
                className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums"
                style={{ color: 'var(--theme-muted)' }}
              >
                {formatBytes(p.rssBytes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ── GPU ──────────────────────────────────────────────────────────────── */

type GpuStatData = {
  vendor: 'nvidia' | 'amd'
  index: number
  name: string
  utilizationPct: number | null
  memUsedBytes: number | null
  memTotalBytes: number | null
  tempC: number | null
}

function GpuPanel() {
  const query = useQuery<{ gpus: Array<GpuStatData> | null }>({
    queryKey: ['system-gpu'],
    queryFn: async () => {
      const res = await fetch('/api/system-gpu', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: POLL_MS_SLOW,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 2000,
  })

  const gpus = query.data?.gpus ?? null
  // No GPU hardware on this host — not an error, just hide the panel once
  // we've actually heard back (never mid-flight, to avoid a loading flash
  // for a panel that's about to disappear).
  if (query.data && (!gpus || gpus.length === 0)) return null

  return (
    <Panel
      title="GPU"
      headerRight={
        gpus && gpus.length > 0 ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--theme-muted)' }}
          >
            {gpus.length} device{gpus.length > 1 ? 's' : ''}
          </span>
        ) : null
      }
    >
      {query.isLoading ? (
        <div
          className="h-24 animate-pulse rounded-lg"
          style={{ background: 'var(--theme-border)' }}
        />
      ) : query.isError ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-danger)' }}>
          Couldn't read GPU stats.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(gpus ?? []).map((g) => (
            <li key={`${g.vendor}-${g.index}`} className="flex items-center gap-3">
              {g.utilizationPct !== null ? (
                <CircularGauge
                  pct={g.utilizationPct}
                  label={g.vendor.toUpperCase()}
                  size={72}
                  strokeWidth={7}
                />
              ) : (
                <div
                  className="flex size-[72px] shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: 'var(--theme-border)' }}
                >
                  <span
                    className="font-mono text-[9px] uppercase"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    {g.vendor}
                  </span>
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className="truncate font-mono text-[11px]"
                  style={{ color: 'var(--theme-text)' }}
                  title={g.name}
                >
                  {g.name}
                </span>
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  {g.memUsedBytes !== null && g.memTotalBytes !== null
                    ? `${formatBytes(g.memUsedBytes)} / ${formatBytes(g.memTotalBytes)} VRAM`
                    : 'VRAM n/a'}
                  {g.tempC !== null ? ` · ${Math.round(g.tempC)}°C` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ── System Logs ──────────────────────────────────────────────────────── */

type LogEntryData = {
  timestampMs: number
  priority: number | null
  unit: string | null
  message: string
}

/** syslog priority: 0-3 crit/err, 4 warning, 5+ notice/info/debug. */
function logPriorityColor(priority: number | null): string {
  if (priority === null) return 'var(--theme-muted)'
  if (priority <= 3) return 'var(--theme-danger)'
  if (priority === 4) return 'var(--theme-warning)'
  return 'var(--theme-muted)'
}

function formatLogTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function LogsPanel() {
  const query = useQuery<{ logs: Array<LogEntryData> | null }>({
    queryKey: ['system-logs'],
    queryFn: async () => {
      const res = await fetch('/api/system-logs', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: POLL_MS_SLOW,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 2000,
  })

  const logs = query.data?.logs ?? []

  return (
    <Panel
      title="System Logs"
      className="lg:col-span-2"
      headerRight={
        <span
          className="font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color: 'var(--theme-muted)' }}
        >
          warning+
        </span>
      }
    >
      {query.isLoading ? (
        <div
          className="h-24 animate-pulse rounded-lg"
          style={{ background: 'var(--theme-border)' }}
        />
      ) : query.isError || query.data?.logs === null ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-muted)' }}>
          Log access unavailable on this host (requires systemd's journalctl).
        </p>
      ) : logs.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-muted)' }}>
          No warnings or errors recently — quiet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {logs.slice(0, 10).map((l, i) => (
            <li
              key={`${l.timestampMs}-${i}`}
              className="flex items-start gap-2 font-mono text-[10px]"
            >
              <span
                className="shrink-0 tabular-nums"
                style={{ color: 'var(--theme-muted)' }}
              >
                {formatLogTime(l.timestampMs)}
              </span>
              {l.unit ? (
                <span
                  className="max-w-[110px] shrink-0 truncate"
                  style={{ color: 'var(--theme-muted)' }}
                  title={l.unit}
                >
                  {l.unit}
                </span>
              ) : null}
              <span
                className="min-w-0 flex-1 truncate"
                style={{ color: logPriorityColor(l.priority) }}
                title={l.message}
              >
                {l.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ── Connections ──────────────────────────────────────────────────────── */

type NetworkConnectionData = {
  protocol: 'tcp' | 'tcp6'
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: string
  pid: number | null
  processName: string | null
}

function ConnectionsPanel() {
  const query = useQuery<{ connections: Array<NetworkConnectionData> | null }>({
    queryKey: ['system-connections'],
    queryFn: async () => {
      const res = await fetch('/api/system-connections', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: POLL_MS_SLOW,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 2000,
  })

  const connections = query.data?.connections ?? []

  return (
    <Panel
      title="Connections"
      className="lg:col-span-2"
      headerRight={
        connections.length > 0 ? (
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--theme-muted)' }}
          >
            {connections.length} established
          </span>
        ) : null
      }
    >
      {query.isLoading ? (
        <div
          className="h-24 animate-pulse rounded-lg"
          style={{ background: 'var(--theme-border)' }}
        />
      ) : query.isError ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-danger)' }}>
          Couldn't read connections.
        </p>
      ) : connections.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--theme-muted)' }}>
          No active connections.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {connections.slice(0, 12).map((c, i) => (
            <li
              key={`${c.protocol}-${c.localPort}-${c.remoteAddress}-${c.remotePort}-${i}`}
              className="flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums"
            >
              <span
                className="min-w-0 flex-1 truncate"
                style={{ color: 'var(--theme-text)' }}
                title={c.processName ?? undefined}
              >
                {c.processName ?? '—'}
                {c.pid !== null ? ` (${c.pid})` : ''}
              </span>
              <span
                className="shrink-0 truncate"
                style={{ color: 'var(--theme-muted)' }}
              >
                :{c.localPort} → {c.remoteAddress}:{c.remotePort}
              </span>
            </li>
          ))}
        </ul>
      )}
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
            <GpuPanel />
            <ServicesPanel />
            <StoragePanel stats={stats} />
            <ProcessesPanel />
            <NetworkPanel stats={stats} history={netHistoryRef.current} />
            <ConnectionsPanel />
            <LogsPanel />
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
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`h-40 rounded-xl border motion-safe:animate-pulse ${
                  i === 0 || i === 6 || i === 7 || i === 8
                    ? 'lg:col-span-2'
                    : ''
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
