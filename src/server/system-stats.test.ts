import { describe, expect, it } from 'vitest'
import {
  computeCpuPct,
  parseLoadavgProcs,
  parseMeminfo,
  parseNetDev,
  parseProcMounts,
  type CpuCoreTimes,
} from './system-stats'

describe('computeCpuPct', () => {
  it('computes busy percentage from idle deltas per core', () => {
    const prev: CpuCoreTimes[] = [
      [100, 0, 50, 850, 0],
      [200, 0, 100, 700, 0],
    ]
    const next: CpuCoreTimes[] = [
      [150, 0, 75, 875, 0], // +100 total, +25 idle → 75% busy
      [200, 0, 100, 800, 0], // +100 total, +100 idle → 0% busy
    ]
    const result = computeCpuPct(prev, next)
    expect(result).not.toBeNull()
    expect(result!.perCorePct[0]).toBe(75)
    expect(result!.perCorePct[1]).toBe(0)
    expect(result!.pct).toBe(37.5)
  })

  it('returns null on core-count mismatch or empty input', () => {
    expect(computeCpuPct([], [])).toBeNull()
    expect(
      computeCpuPct([[1, 0, 1, 1, 0]], [
        [1, 0, 1, 1, 0],
        [1, 0, 1, 1, 0],
      ]),
    ).toBeNull()
  })

  it('clamps a zero or negative delta window to 0%', () => {
    const same: CpuCoreTimes[] = [[100, 0, 50, 850, 0]]
    expect(computeCpuPct(same, same)!.pct).toBe(0)
  })
})

describe('parseMeminfo', () => {
  const sample = [
    'MemTotal:       16303584 kB',
    'MemFree:         1244076 kB',
    'MemAvailable:    9635776 kB',
    'Buffers:          200000 kB',
    'Cached:          6000000 kB',
    'SReclaimable:     300000 kB',
    'SwapTotal:       2097148 kB',
    'SwapFree:        2097148 kB',
    '',
  ].join('\n')

  it('uses MemAvailable for used memory, not MemFree', () => {
    const { memory } = parseMeminfo(sample)
    expect(memory).not.toBeNull()
    expect(memory!.totalBytes).toBe(16303584 * 1024)
    expect(memory!.usedBytes).toBe((16303584 - 9635776) * 1024)
    expect(memory!.pct).toBeCloseTo(40.9, 1)
  })

  it('sums Cached + Buffers + SReclaimable into cachedBytes', () => {
    const { memory } = parseMeminfo(sample)
    expect(memory!.cachedBytes).toBe((6000000 + 200000 + 300000) * 1024)
  })

  it('reports fully-free swap as 0% used', () => {
    const { swap } = parseMeminfo(sample)
    expect(swap).not.toBeNull()
    expect(swap!.usedBytes).toBe(0)
    expect(swap!.pct).toBe(0)
  })

  it('returns null swap when SwapTotal is 0 and null memory when fields are missing', () => {
    expect(parseMeminfo('SwapTotal: 0 kB\nSwapFree: 0 kB').swap).toBeNull()
    expect(parseMeminfo('garbage').memory).toBeNull()
  })
})

describe('parseProcMounts', () => {
  it('keeps real filesystems, drops pseudo mounts, dedupes by device', () => {
    const sample = [
      'proc /proc proc rw 0 0',
      'sysfs /sys sysfs rw 0 0',
      'tmpfs /run tmpfs rw 0 0',
      '/dev/sda1 / ext4 rw 0 0',
      '/dev/sda1 /var/snap/bind ext4 rw 0 0', // bind remount of same device
      '/dev/sdb1 /home xfs rw 0 0',
      'overlay /var/lib/docker/overlay2/x overlay rw 0 0',
    ].join('\n')
    const mounts = parseProcMounts(sample)
    expect(mounts.map((m) => m.mount)).toEqual(['/', '/home'])
    expect(mounts[1].fsType).toBe('xfs')
  })

  it('unescapes \\040 spaces in mount paths', () => {
    const mounts = parseProcMounts('/dev/sdc1 /mnt/my\\040disk ext4 rw 0 0')
    expect(mounts[0].mount).toBe('/mnt/my disk')
  })
})

describe('parseNetDev', () => {
  it('sums rx/tx bytes across interfaces, excluding loopback', () => {
    const sample = [
      'Inter-|   Receive                                                |  Transmit',
      ' face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed',
      '    lo: 5000000    1000    0    0    0     0          0         0  5000000    1000    0    0    0     0       0          0',
      '  eth0: 1000000     800    0    0    0     0          0         0   400000     600    0    0    0     0       0          0',
      'wlan0:  250000     200    0    0    0     0          0         0    50000     100    0    0    0     0       0          0',
    ].join('\n')
    const totals = parseNetDev(sample)
    expect(totals.rx).toBe(1250000)
    expect(totals.tx).toBe(450000)
  })

  it('reports per-interface counters, excluding loopback', () => {
    const totals = parseNetDev(
      '  eth0: 100 1 0 0 0 0 0 0 50 1 0 0 0 0 0 0\n    lo: 999 1 0 0 0 0 0 0 999 1 0 0 0 0 0 0',
    )
    expect(totals.ifaces).toEqual([{ name: 'eth0', rx: 100, tx: 50 }])
  })
})

describe('parseLoadavgProcs', () => {
  it('parses the runnable/total field', () => {
    expect(parseLoadavgProcs('1.48 1.44 1.44 2/1250 12345\n')).toEqual({
      running: 2,
      total: 1250,
    })
  })

  it('returns null on malformed input', () => {
    expect(parseLoadavgProcs('garbage')).toBeNull()
  })
})
