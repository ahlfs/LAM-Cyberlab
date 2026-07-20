/**
 * Per-process CPU/RAM stats and lightweight process-name lookups, backing
 * the System page's "Top Processes" panel and the Caddy row in "Active
 * Services" (Caddy has no fixed HTTP health endpoint by default, so its
 * status is answered by "is a process named caddy running" instead).
 *
 * Linux-only: reads /proc directly, same approach as system-stats.ts.
 * CPU% is a rate, so — like system-stats.ts's whole-system CPU calc — this
 * keeps the previous per-PID sample between calls and diffs against it.
 */
import { promises as fs } from 'node:fs'

export type ProcessInfo = {
  pid: number
  name: string
  cpuPct: number
  rssBytes: number
}

// Linux USER_HZ is 100 on effectively every modern distro/arch; there is no
// portable way to read the real value from Node without a native binding.
const CLK_TCK = 100

const clampPct = (n: number) => Math.min(100, Math.max(0, n))

type CpuSample = { utime: number; stime: number; at: number }
let prevSamples = new Map<number, CpuSample>()

/** Pure parser for /proc/pid/stat content. comm can contain spaces/parens, so split on the last ')'. utime/stime are fields 14/15 (1-indexed). */
export function parseProcStat(
  raw: string,
): { name: string; utime: number; stime: number } | null {
  const openParen = raw.indexOf('(')
  const closeParen = raw.lastIndexOf(')')
  if (openParen === -1 || closeParen === -1) return null
  const name = raw.slice(openParen + 1, closeParen)
  const rest = raw.slice(closeParen + 2).trim().split(/\s+/)
  // rest[0] = state (field 3) ... rest[11] = utime (field 14), rest[12] = stime (field 15)
  const utime = Number(rest[11])
  const stime = Number(rest[12])
  if (!Number.isFinite(utime) || !Number.isFinite(stime)) return null
  return { name, utime, stime }
}

/** Pure parser for /proc/pid/status content — just the RSS line. */
export function parseVmRssBytes(raw: string): number {
  const m = /^VmRSS:\s+(\d+)\s*kB/m.exec(raw)
  return m ? Number(m[1]) * 1024 : 0
}

/** Pure CPU% calc from two ticks samples — same shape as system-stats.ts's computeCpuPct. */
export function computeProcessCpuPct(
  prev: { utime: number; stime: number; at: number },
  next: { utime: number; stime: number; at: number },
): number {
  const dTicks = next.utime + next.stime - (prev.utime + prev.stime)
  const dSec = (next.at - prev.at) / 1000
  if (dSec <= 0 || dTicks <= 0) return 0
  return clampPct((dTicks / CLK_TCK / dSec) * 100)
}

async function listPids(): Promise<Array<number>> {
  try {
    const entries = await fs.readdir('/proc')
    return entries.filter((e) => /^\d+$/.test(e)).map(Number)
  } catch {
    return []
  }
}

async function readProcessCpuTimes(
  pid: number,
): Promise<{ name: string; utime: number; stime: number } | null> {
  try {
    return parseProcStat(await fs.readFile(`/proc/${pid}/stat`, 'utf-8'))
  } catch {
    return null
  }
}

async function readProcessRssBytes(pid: number): Promise<number> {
  try {
    return parseVmRssBytes(await fs.readFile(`/proc/${pid}/status`, 'utf-8'))
  } catch {
    return 0
  }
}

/** Full per-process CPU% + RSS for every running process. Powers Top Processes. */
export async function listProcesses(): Promise<Array<ProcessInfo>> {
  const pids = await listPids()
  const now = Date.now()
  const nextSamples = new Map<number, CpuSample>()
  const results: Array<ProcessInfo> = []

  await Promise.all(
    pids.map(async (pid) => {
      const times = await readProcessCpuTimes(pid)
      if (!times) return
      nextSamples.set(pid, { utime: times.utime, stime: times.stime, at: now })

      const prev = prevSamples.get(pid)
      const cpuPct = prev
        ? computeProcessCpuPct(prev, { ...times, at: now })
        : 0

      const rssBytes = await readProcessRssBytes(pid)
      results.push({ pid, name: times.name, cpuPct, rssBytes })
    }),
  )

  prevSamples = nextSamples
  return results
}

export async function getTopProcesses(limit = 8): Promise<Array<ProcessInfo>> {
  const all = await listProcesses()
  return all.sort((a, b) => b.cpuPct - a.cpuPct).slice(0, limit)
}

/** Lightweight existence check — reads only /proc/pid/comm, no CPU/RSS work. */
export async function isProcessRunning(name: string): Promise<boolean> {
  const pids = await listPids()
  const target = name.trim().toLowerCase()
  if (!target) return false

  const names = await Promise.all(
    pids.map(async (pid) => {
      try {
        return (await fs.readFile(`/proc/${pid}/comm`, 'utf-8')).trim().toLowerCase()
      } catch {
        return ''
      }
    }),
  )
  return names.some((n) => n === target)
}
