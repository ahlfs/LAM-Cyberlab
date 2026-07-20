/**
 * Host system statistics for the dashboard System Monitor widget.
 *
 * Linux-first: /proc and /sys are the primary sources, with node:os
 * fallbacks where they exist. Every section degrades to `null` when its
 * source is unavailable so the widget hides rows instead of stacking
 * "N/A" noise (PRD: graceful degradation on non-Linux hosts).
 *
 * CPU % and network B/s are rates, so the module keeps the previous
 * sample between calls. The first call seeds a baseline and re-samples
 * after a short delay to return real numbers instead of zeros.
 */
import { promises as fs } from 'node:fs'
import os from 'node:os'

export type DiskStat = {
  mount: string
  fsType: string
  totalBytes: number
  usedBytes: number
  pct: number
}

export type InterfaceRate = {
  name: string
  rxBytesPerSec: number
  txBytesPerSec: number
}

export type DiskIoRate = {
  device: string
  readBytesPerSec: number
  writeBytesPerSec: number
}

export type SystemStats = {
  sampledAt: number
  hostname: string
  platform: NodeJS.Platform
  uptimeSec: number
  loadAvg: [number, number, number]
  cpu: { pct: number; perCorePct: number[] } | null
  memory: {
    totalBytes: number
    usedBytes: number
    /** Page cache + buffers + reclaimable slab — memory the kernel gives back on demand. */
    cachedBytes: number
    pct: number
  } | null
  swap: { totalBytes: number; usedBytes: number; pct: number } | null
  disks: DiskStat[] | null
  network: {
    rxBytesPerSec: number
    txBytesPerSec: number
    interfaces: InterfaceRate[]
  } | null
  /** From /proc/loadavg field 4 ("runnable/total"); null off-Linux. */
  procs: { running: number; total: number } | null
  tempC: number | null
  diskIo: DiskIoRate[] | null
}

/** [user, nice, sys, idle, irq] per core, in ms (node:os units). */
export type CpuCoreTimes = [number, number, number, number, number]

const clampPct = (n: number) => Math.min(100, Math.max(0, n))

export function computeCpuPct(
  prev: CpuCoreTimes[],
  next: CpuCoreTimes[],
): { pct: number; perCorePct: number[] } | null {
  if (prev.length === 0 || prev.length !== next.length) return null
  const perCorePct = next.map((n, i) => {
    const p = prev[i]
    const dTotal =
      n[0] + n[1] + n[2] + n[3] + n[4] - (p[0] + p[1] + p[2] + p[3] + p[4])
    if (dTotal <= 0) return 0
    const dIdle = n[3] - p[3]
    return clampPct(((dTotal - dIdle) / dTotal) * 100)
  })
  const pct = perCorePct.reduce((a, b) => a + b, 0) / perCorePct.length
  return { pct, perCorePct }
}

export function parseMeminfo(text: string): {
  memory: SystemStats['memory']
  swap: SystemStats['swap']
} {
  const kb = new Map<string, number>()
  for (const line of text.split('\n')) {
    const m = /^(\w+):\s+(\d+)\s*kB/.exec(line)
    if (m) kb.set(m[1], Number(m[2]) * 1024)
  }
  const total = kb.get('MemTotal')
  const available = kb.get('MemAvailable')
  const cachedBytes =
    (kb.get('Cached') ?? 0) + (kb.get('Buffers') ?? 0) + (kb.get('SReclaimable') ?? 0)
  const memory =
    total && available !== undefined
      ? {
          totalBytes: total,
          usedBytes: total - available,
          cachedBytes,
          pct: clampPct(((total - available) / total) * 100),
        }
      : null
  const swapTotal = kb.get('SwapTotal') ?? 0
  const swapFree = kb.get('SwapFree') ?? 0
  const swap =
    swapTotal > 0
      ? {
          totalBytes: swapTotal,
          usedBytes: swapTotal - swapFree,
          pct: clampPct(((swapTotal - swapFree) / swapTotal) * 100),
        }
      : null
  return { memory, swap }
}

/** Real, user-meaningful filesystems only — no proc/sys/tmpfs/overlay noise. */
const REAL_FS_TYPES = new Set([
  'ext2',
  'ext3',
  'ext4',
  'xfs',
  'btrfs',
  'zfs',
  'f2fs',
  'vfat',
  'exfat',
  'ntfs',
  'ntfs3',
  'fuseblk',
  'apfs',
  'ufs',
])

export function parseProcMounts(
  text: string,
): Array<{ device: string; mount: string; fsType: string }> {
  const byDevice = new Map<
    string,
    { device: string; mount: string; fsType: string }
  >()
  for (const line of text.split('\n')) {
    const [device, mount, fsType] = line.split(' ')
    if (!device || !mount || !fsType) continue
    if (!REAL_FS_TYPES.has(fsType)) continue
    // One entry per device; keep the shortest mount path (the canonical
    // one — bind mounts and snap-style remounts repeat the device).
    const existing = byDevice.get(device)
    if (!existing || mount.length < existing.mount.length) {
      // /proc/mounts escapes spaces as \040
      byDevice.set(device, {
        device,
        mount: mount.replace(/\\040/g, ' '),
        fsType,
      })
    }
  }
  return [...byDevice.values()]
}

export function parseNetDev(text: string): {
  rx: number
  tx: number
  ifaces: Array<{ name: string; rx: number; tx: number }>
} {
  let rx = 0
  let tx = 0
  const ifaces: Array<{ name: string; rx: number; tx: number }> = []
  for (const line of text.split('\n')) {
    const m = /^\s*([^:\s]+):\s*(.+)$/.exec(line)
    if (!m) continue
    const iface = m[1]
    if (iface === 'lo') continue
    const fields = m[2].trim().split(/\s+/)
    // /proc/net/dev: rx_bytes is field 0, tx_bytes is field 8.
    if (fields.length < 9) continue
    const ifRx = Number(fields[0]) || 0
    const ifTx = Number(fields[8]) || 0
    rx += ifRx
    tx += ifTx
    ifaces.push({ name: iface, rx: ifRx, tx: ifTx })
  }
  return { rx, tx, ifaces }
}

/** Whole-disk device names only — excludes partitions (sda1, nvme0n1p1, ...). */
const WHOLE_DISK_RE = /^(sd[a-z]+|vd[a-z]+|hd[a-z]+|xvd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/

export type DiskStatsSnapshot = Map<
  string,
  { sectorsRead: number; sectorsWritten: number }
>

export function parseDiskStats(text: string): DiskStatsSnapshot {
  const stats: DiskStatsSnapshot = new Map()
  for (const line of text.split('\n')) {
    const fields = line.trim().split(/\s+/)
    // major minor name reads_completed reads_merged sectors_read
    // time_reading writes_completed writes_merged sectors_written ...
    if (fields.length < 10) continue
    const device = fields[2]
    if (!device || !WHOLE_DISK_RE.test(device)) continue
    stats.set(device, {
      sectorsRead: Number(fields[5]) || 0,
      sectorsWritten: Number(fields[9]) || 0,
    })
  }
  return stats
}

export function parseLoadavgProcs(
  text: string,
): { running: number; total: number } | null {
  const m = /^\S+\s+\S+\s+\S+\s+(\d+)\/(\d+)/.exec(text.trim())
  if (!m) return null
  return { running: Number(m[1]), total: Number(m[2]) }
}

function snapshotCpu(): CpuCoreTimes[] {
  return os
    .cpus()
    .map((c): CpuCoreTimes => [
      c.times.user,
      c.times.nice,
      c.times.sys,
      c.times.idle,
      c.times.irq,
    ])
}

async function readMemory(): Promise<{
  memory: SystemStats['memory']
  swap: SystemStats['swap']
}> {
  try {
    return parseMeminfo(await fs.readFile('/proc/meminfo', 'utf-8'))
  } catch {
    const totalBytes = os.totalmem()
    const usedBytes = totalBytes - os.freemem()
    return {
      memory: {
        totalBytes,
        usedBytes,
        cachedBytes: 0,
        pct: clampPct((usedBytes / totalBytes) * 100),
      },
      swap: null,
    }
  }
}

const MAX_DISKS = 6

async function readDisks(): Promise<SystemStats['disks']> {
  let mounts: Array<{ mount: string; fsType: string }>
  try {
    mounts = parseProcMounts(await fs.readFile('/proc/mounts', 'utf-8'))
  } catch {
    mounts = [{ mount: '/', fsType: 'unknown' }]
  }
  const disks: DiskStat[] = []
  for (const { mount, fsType } of mounts) {
    try {
      const s = await fs.statfs(mount)
      const totalBytes = s.blocks * s.bsize
      if (totalBytes <= 0) continue
      const usedBytes = (s.blocks - s.bfree) * s.bsize
      // df-style percentage: used against space visible to users.
      const visible = usedBytes + s.bavail * s.bsize
      disks.push({
        mount,
        fsType,
        totalBytes,
        usedBytes,
        pct: clampPct(visible > 0 ? (usedBytes / visible) * 100 : 0),
      })
    } catch {
      // unreadable mount (permissions, stale NFS) — skip it
    }
  }
  disks.sort((a, b) => b.totalBytes - a.totalBytes)
  return disks.length > 0 ? disks.slice(0, MAX_DISKS) : null
}

type NetSnapshot = ReturnType<typeof parseNetDev>

async function readNetTotals(): Promise<NetSnapshot | null> {
  try {
    return parseNetDev(await fs.readFile('/proc/net/dev', 'utf-8'))
  } catch {
    return null
  }
}

const SECTOR_BYTES = 512

async function readDiskStatsSnapshot(): Promise<DiskStatsSnapshot | null> {
  try {
    return parseDiskStats(await fs.readFile('/proc/diskstats', 'utf-8'))
  } catch {
    return null
  }
}

async function readProcs(): Promise<SystemStats['procs']> {
  try {
    return parseLoadavgProcs(await fs.readFile('/proc/loadavg', 'utf-8'))
  } catch {
    return null
  }
}

async function readTempC(): Promise<number | null> {
  try {
    const zones = (await fs.readdir('/sys/class/thermal')).filter((z) =>
      z.startsWith('thermal_zone'),
    )
    let max: number | null = null
    for (const zone of zones) {
      try {
        const raw = await fs.readFile(
          `/sys/class/thermal/${zone}/temp`,
          'utf-8',
        )
        const milli = Number(raw.trim())
        // Plausible range only; some zones report junk like -273000.
        if (Number.isFinite(milli) && milli > 0 && milli < 150000) {
          const c = milli / 1000
          if (max === null || c > max) max = c
        }
      } catch {
        // zone unreadable — ignore
      }
    }
    return max
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Module-level baselines for rate computation between polls. */
let prevCpu: { coreTimes: CpuCoreTimes[]; at: number } | null = null
let prevNet: { snapshot: NetSnapshot; at: number } | null = null
let prevDiskIo: { snapshot: DiskStatsSnapshot; at: number } | null = null

/** Minimum delta window for a meaningful rate; below this, re-sample. */
const MIN_RATE_WINDOW_MS = 150

export async function collectSystemStats(): Promise<SystemStats> {
  let cpuNow = snapshotCpu()
  let netNow = await readNetTotals()
  let diskIoNow = await readDiskStatsSnapshot()
  let now = Date.now()

  // First call (or hot-reload reset): seed baselines, wait a beat, and
  // re-sample so the response carries real rates instead of zeros.
  if (!prevCpu || now - prevCpu.at < MIN_RATE_WINDOW_MS) {
    prevCpu = { coreTimes: cpuNow, at: now }
    if (netNow) prevNet = { snapshot: netNow, at: now }
    if (diskIoNow) prevDiskIo = { snapshot: diskIoNow, at: now }
    await sleep(MIN_RATE_WINDOW_MS)
    cpuNow = snapshotCpu()
    netNow = await readNetTotals()
    diskIoNow = await readDiskStatsSnapshot()
    now = Date.now()
  }

  const cpu = computeCpuPct(prevCpu.coreTimes, cpuNow)
  prevCpu = { coreTimes: cpuNow, at: now }

  let network: SystemStats['network'] = null
  if (netNow) {
    if (prevNet && now > prevNet.at) {
      const dt = (now - prevNet.at) / 1000
      const prevByName = new Map(
        prevNet.snapshot.ifaces.map((i) => [i.name, i]),
      )
      const interfaces: InterfaceRate[] = netNow.ifaces
        .filter((i) => i.rx + i.tx > 0)
        .map((i) => {
          const p = prevByName.get(i.name)
          return {
            name: i.name,
            rxBytesPerSec: p ? Math.max(0, (i.rx - p.rx) / dt) : 0,
            txBytesPerSec: p ? Math.max(0, (i.tx - p.tx) / dt) : 0,
          }
        })
        .sort(
          (a, b) =>
            b.rxBytesPerSec + b.txBytesPerSec - (a.rxBytesPerSec + a.txBytesPerSec),
        )
      network = {
        rxBytesPerSec: Math.max(0, (netNow.rx - prevNet.snapshot.rx) / dt),
        txBytesPerSec: Math.max(0, (netNow.tx - prevNet.snapshot.tx) / dt),
        interfaces,
      }
    }
    prevNet = { snapshot: netNow, at: now }
  }

  let diskIo: SystemStats['diskIo'] = null
  if (diskIoNow) {
    if (prevDiskIo && now > prevDiskIo.at) {
      const dt = (now - prevDiskIo.at) / 1000
      diskIo = [...diskIoNow.entries()]
        .map(([device, s]) => {
          const p = prevDiskIo!.snapshot.get(device)
          return {
            device,
            readBytesPerSec: p
              ? Math.max(0, ((s.sectorsRead - p.sectorsRead) * SECTOR_BYTES) / dt)
              : 0,
            writeBytesPerSec: p
              ? Math.max(0, ((s.sectorsWritten - p.sectorsWritten) * SECTOR_BYTES) / dt)
              : 0,
          }
        })
        .filter((d) => d.readBytesPerSec + d.writeBytesPerSec > 0)
        .sort(
          (a, b) =>
            b.readBytesPerSec + b.writeBytesPerSec - (a.readBytesPerSec + a.writeBytesPerSec),
        )
    }
    prevDiskIo = { snapshot: diskIoNow, at: now }
  }

  const [{ memory, swap }, disks, tempC, procs] = await Promise.all([
    readMemory(),
    readDisks(),
    readTempC(),
    readProcs(),
  ])

  const [l1, l5, l15] = os.loadavg()
  return {
    sampledAt: now,
    hostname: os.hostname(),
    platform: process.platform,
    uptimeSec: os.uptime(),
    loadAvg: [l1, l5, l15],
    cpu,
    memory,
    swap,
    disks,
    network,
    procs,
    tempC,
    diskIo,
  }
}
