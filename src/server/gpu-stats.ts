/**
 * GPU statistics for the System Monitor widget.
 *
 * NVIDIA via `nvidia-smi` (CSV output), AMD via the amdgpu driver's sysfs
 * interface. Both are optional: a host with neither (or only one) degrades
 * to an empty list instead of erroring, matching system-stats.ts's
 * graceful-degradation contract.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'

const execFileAsync = promisify(execFile)

export type GpuStat = {
  vendor: 'nvidia' | 'amd'
  index: number
  name: string
  utilizationPct: number | null
  memUsedBytes: number | null
  memTotalBytes: number | null
  tempC: number | null
}

export function parseNvidiaSmiCsv(text: string): GpuStat[] {
  const gpus: GpuStat[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const fields = trimmed.split(',').map((f) => f.trim())
    if (fields.length < 6) continue
    const [indexRaw, name, utilRaw, memUsedRaw, memTotalRaw, tempRaw] = fields
    const index = Number(indexRaw)
    if (!Number.isFinite(index)) continue
    const toNumOrNull = (raw: string) => {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    const util = toNumOrNull(utilRaw)
    const memUsedMiB = toNumOrNull(memUsedRaw)
    const memTotalMiB = toNumOrNull(memTotalRaw)
    gpus.push({
      vendor: 'nvidia',
      index,
      name: name || `NVIDIA GPU ${index}`,
      utilizationPct: util,
      memUsedBytes: memUsedMiB !== null ? memUsedMiB * 1024 * 1024 : null,
      memTotalBytes: memTotalMiB !== null ? memTotalMiB * 1024 * 1024 : null,
      tempC: toNumOrNull(tempRaw),
    })
  }
  return gpus
}

async function getNvidiaGpus(): Promise<GpuStat[]> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      [
        '--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu',
        '--format=csv,noheader,nounits',
      ],
      { timeout: 3000 },
    )
    return parseNvidiaSmiCsv(stdout)
  } catch {
    // nvidia-smi missing, no NVIDIA driver, or it timed out — no NVIDIA GPUs to report.
    return []
  }
}

/** AMD's PCI vendor ID, as reported by /sys/class/drm/cardN/device/vendor. */
const AMD_PCI_VENDOR_ID = '0x1002'

export function parseAmdSysfsInt(raw: string): number | null {
  const n = Number(raw.trim())
  return Number.isFinite(n) ? n : null
}

async function readSysfsFile(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf-8')
  } catch {
    return null
  }
}

async function readAmdTempC(deviceDir: string): Promise<number | null> {
  try {
    const hwmonRoot = `${deviceDir}/hwmon`
    const hwmonDirs = await fs.readdir(hwmonRoot)
    for (const dir of hwmonDirs) {
      const raw = await readSysfsFile(`${hwmonRoot}/${dir}/temp1_input`)
      if (raw === null) continue
      const milli = parseAmdSysfsInt(raw)
      if (milli !== null) return milli / 1000
    }
    return null
  } catch {
    return null
  }
}

async function getAmdGpus(): Promise<GpuStat[]> {
  const drmRoot = '/sys/class/drm'
  let entries: string[]
  try {
    entries = await fs.readdir(drmRoot)
  } catch {
    return []
  }
  // Whole-card device dirs only (card0, card1, ...) — not connector dirs
  // like card0-DP-1.
  const cardDirs = entries.filter((e) => /^card\d+$/.test(e)).sort()

  const gpus: GpuStat[] = []
  let index = 0
  for (const card of cardDirs) {
    const deviceDir = `${drmRoot}/${card}/device`
    const vendor = await readSysfsFile(`${deviceDir}/vendor`)
    if (!vendor || vendor.trim().toLowerCase() !== AMD_PCI_VENDOR_ID) continue

    const [busyRaw, usedRaw, totalRaw, tempC] = await Promise.all([
      readSysfsFile(`${deviceDir}/gpu_busy_percent`),
      readSysfsFile(`${deviceDir}/mem_info_vram_used`),
      readSysfsFile(`${deviceDir}/mem_info_vram_total`),
      readAmdTempC(deviceDir),
    ])

    gpus.push({
      vendor: 'amd',
      index,
      name: `AMD GPU ${index}`,
      utilizationPct: busyRaw !== null ? parseAmdSysfsInt(busyRaw) : null,
      memUsedBytes: usedRaw !== null ? parseAmdSysfsInt(usedRaw) : null,
      memTotalBytes: totalRaw !== null ? parseAmdSysfsInt(totalRaw) : null,
      tempC,
    })
    index += 1
  }
  return gpus
}

export async function getGpuStats(): Promise<GpuStat[] | null> {
  const [nvidia, amd] = await Promise.all([getNvidiaGpus(), getAmdGpus()])
  const gpus = [...nvidia, ...amd]
  return gpus.length > 0 ? gpus : null
}
