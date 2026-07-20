/**
 * Active (ESTABLISHED) TCP connections for the System Monitor widget.
 *
 * Parses /proc/net/tcp and /proc/net/tcp6 directly (hex-encoded,
 * little-endian IP:port, numeric state codes) rather than shelling out to
 * `ss`/`netstat`, which aren't guaranteed present. Socket inode → PID/name
 * is resolved by scanning /proc/*\/fd for `socket:[inode]` symlinks — this
 * only sees sockets owned by the same user the workspace runs as, which
 * degrades gracefully (an unresolved PID is simply left null).
 */
import { promises as fs } from 'node:fs'

export type NetworkConnection = {
  protocol: 'tcp' | 'tcp6'
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: string
  pid: number | null
  processName: string | null
}

/** RFC 793 TCP state codes, as used in /proc/net/tcp{,6}'s `st` column. */
export const TCP_STATE_NAMES: Record<string, string> = {
  '01': 'ESTABLISHED',
  '02': 'SYN_SENT',
  '03': 'SYN_RECV',
  '04': 'FIN_WAIT1',
  '05': 'FIN_WAIT2',
  '06': 'TIME_WAIT',
  '07': 'CLOSE',
  '08': 'CLOSE_WAIT',
  '09': 'LAST_ACK',
  '0A': 'LISTEN',
  '0B': 'CLOSING',
}

type RawConnection = {
  protocol: 'tcp' | 'tcp6'
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: string
  inode: number
}

function hexToIPv4(hex: string): string {
  const b0 = parseInt(hex.slice(0, 2), 16)
  const b1 = parseInt(hex.slice(2, 4), 16)
  const b2 = parseInt(hex.slice(4, 6), 16)
  const b3 = parseInt(hex.slice(6, 8), 16)
  return `${b3}.${b2}.${b1}.${b0}`
}

function compressIPv6(hextets: string[]): string {
  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < hextets.length; i++) {
    if (hextets[i] === '0') {
      if (curStart === -1) curStart = i
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curStart = -1
      curLen = 0
    }
  }
  if (bestLen < 2) return hextets.join(':')
  const head = hextets.slice(0, bestStart)
  const tail = hextets.slice(bestStart + bestLen)
  return `${head.join(':')}::${tail.join(':')}`
}

function hexToIPv6(hex: string): string {
  const bytes: number[] = []
  for (let w = 0; w < 4; w++) {
    const chunk = hex.slice(w * 8, w * 8 + 8)
    const wordBytes = [
      chunk.slice(0, 2),
      chunk.slice(2, 4),
      chunk.slice(4, 6),
      chunk.slice(6, 8),
    ].reverse()
    for (const b of wordBytes) bytes.push(parseInt(b, 16))
  }
  const hextets: string[] = []
  for (let i = 0; i < 16; i += 2) {
    const val = (bytes[i] << 8) | bytes[i + 1]
    hextets.push(val.toString(16))
  }
  return compressIPv6(hextets)
}

function parseHexAddress(
  raw: string,
  protocol: 'tcp' | 'tcp6',
): { address: string; port: number } | null {
  const [ipHex, portHex] = raw.split(':')
  if (!ipHex || !portHex) return null
  const port = parseInt(portHex, 16)
  if (!Number.isFinite(port)) return null
  if (protocol === 'tcp') {
    if (ipHex.length !== 8) return null
    return { address: hexToIPv4(ipHex), port }
  }
  if (ipHex.length !== 32) return null
  return { address: hexToIPv6(ipHex), port }
}

/** Parses /proc/net/tcp or /proc/net/tcp6 (all states, not just ESTABLISHED). */
export function parseProcNetTcp(
  text: string,
  protocol: 'tcp' | 'tcp6',
): RawConnection[] {
  const rows: RawConnection[] = []
  for (const line of text.split('\n')) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 10) continue
    const local = parseHexAddress(fields[1], protocol)
    const remote = parseHexAddress(fields[2], protocol)
    if (!local || !remote) continue
    const stateCode = fields[3].toUpperCase()
    const inode = Number(fields[9])
    if (!Number.isFinite(inode)) continue
    rows.push({
      protocol,
      localAddress: local.address,
      localPort: local.port,
      remoteAddress: remote.address,
      remotePort: remote.port,
      state: TCP_STATE_NAMES[stateCode] ?? stateCode,
      inode,
    })
  }
  return rows
}

async function readProcNetTcp(
  path: string,
  protocol: 'tcp' | 'tcp6',
): Promise<RawConnection[] | null> {
  try {
    return parseProcNetTcp(await fs.readFile(path, 'utf-8'), protocol)
  } catch {
    return null
  }
}

async function buildInodeToPidMap(): Promise<
  Map<number, { pid: number; name: string }>
> {
  const map = new Map<number, { pid: number; name: string }>()
  let pidDirs: string[]
  try {
    pidDirs = (await fs.readdir('/proc')).filter((d) => /^\d+$/.test(d))
  } catch {
    return map
  }
  await Promise.all(
    pidDirs.map(async (pidStr) => {
      let fdNames: string[]
      try {
        fdNames = await fs.readdir(`/proc/${pidStr}/fd`)
      } catch {
        return
      }
      const pid = Number(pidStr)
      let name: string | null = null
      for (const fd of fdNames) {
        let link: string
        try {
          link = await fs.readlink(`/proc/${pidStr}/fd/${fd}`)
        } catch {
          continue
        }
        const m = /^socket:\[(\d+)\]$/.exec(link)
        if (!m) continue
        if (name === null) {
          try {
            name = (
              await fs.readFile(`/proc/${pidStr}/comm`, 'utf-8')
            ).trim()
          } catch {
            name = 'unknown'
          }
        }
        map.set(Number(m[1]), { pid, name })
      }
    }),
  )
  return map
}

const MAX_CONNECTIONS = 100

export async function getNetworkConnections(): Promise<
  NetworkConnection[] | null
> {
  const [tcp4, tcp6, inodeMap] = await Promise.all([
    readProcNetTcp('/proc/net/tcp', 'tcp'),
    readProcNetTcp('/proc/net/tcp6', 'tcp6'),
    buildInodeToPidMap(),
  ])
  if (tcp4 === null && tcp6 === null) return null

  const established = [...(tcp4 ?? []), ...(tcp6 ?? [])].filter(
    (c) => c.state === 'ESTABLISHED',
  )

  return established.slice(0, MAX_CONNECTIONS).map((c) => {
    const proc = inodeMap.get(c.inode)
    return {
      protocol: c.protocol,
      localAddress: c.localAddress,
      localPort: c.localPort,
      remoteAddress: c.remoteAddress,
      remotePort: c.remotePort,
      state: c.state,
      pid: proc?.pid ?? null,
      processName: proc?.name ?? null,
    }
  })
}
