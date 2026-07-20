import { describe, expect, it } from 'vitest'
import { computeProcessCpuPct, parseProcStat, parseVmRssBytes } from './process-monitor'

describe('parseProcStat', () => {
  it('parses a normal /proc/pid/stat line', () => {
    // Real-shaped line: pid (comm) state ppid pgrp session tty tpgid flags
    // minflt cminflt majflt cmajflt utime stime ...
    const raw =
      '1234 (node) S 1 1234 1234 0 -1 4194304 100 0 0 0 5000 1200 0 0 20 0 4 0 999999 123456789 1234 18446744073709551615 1 1 0 0 0 0 0 0 0 0 0 0 17 0 0 0 0 0 0'
    const result = parseProcStat(raw)
    expect(result).toEqual({ name: 'node', utime: 5000, stime: 1200 })
  })

  it('handles a process name containing spaces and parens', () => {
    const raw =
      '5678 (my (weird) proc) S 1 5678 5678 0 -1 4194304 0 0 0 0 300 100 0 0 20 0 1 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1'
    const result = parseProcStat(raw)
    expect(result?.name).toBe('my (weird) proc')
    expect(result?.utime).toBe(300)
    expect(result?.stime).toBe(100)
  })

  it('returns null for malformed input', () => {
    expect(parseProcStat('garbage no parens here')).toBeNull()
    expect(parseProcStat('')).toBeNull()
  })
})

describe('parseVmRssBytes', () => {
  it('parses VmRSS from /proc/pid/status content', () => {
    const raw = [
      'Name:\tnode',
      'State:\tS (sleeping)',
      'VmPeak:\t  812340 kB',
      'VmRSS:\t   184320 kB',
      'VmData:\t  500000 kB',
    ].join('\n')
    expect(parseVmRssBytes(raw)).toBe(184320 * 1024)
  })

  it('returns 0 when VmRSS is missing', () => {
    expect(parseVmRssBytes('Name:\tnode\nState:\tS\n')).toBe(0)
  })
})

describe('computeProcessCpuPct', () => {
  it('computes 0% when the process was fully idle over the window', () => {
    const prev = { utime: 100, stime: 50, at: 0 }
    const next = { utime: 100, stime: 50, at: 1000 }
    expect(computeProcessCpuPct(prev, next)).toBe(0)
  })

  it('computes ~50% for a process using half a core over 1s (CLK_TCK=100)', () => {
    // 50 ticks over 1 real second, at 100 ticks/sec = 50% of one core.
    const prev = { utime: 100, stime: 0, at: 0 }
    const next = { utime: 150, stime: 0, at: 1000 }
    expect(computeProcessCpuPct(prev, next)).toBeCloseTo(50, 5)
  })

  it('splits utime+stime combined into the rate', () => {
    const prev = { utime: 0, stime: 0, at: 0 }
    const next = { utime: 50, stime: 50, at: 1000 } // 100 ticks = 100% of one core
    expect(computeProcessCpuPct(prev, next)).toBeCloseTo(100, 5)
  })

  it('clamps at 100% even for a very short window with a big tick delta', () => {
    const prev = { utime: 0, stime: 0, at: 0 }
    const next = { utime: 10_000, stime: 0, at: 10 }
    expect(computeProcessCpuPct(prev, next)).toBe(100)
  })

  it('returns 0 for a non-positive or zero time delta (clock skew / same-tick reads)', () => {
    const prev = { utime: 100, stime: 0, at: 1000 }
    const next = { utime: 200, stime: 0, at: 1000 }
    expect(computeProcessCpuPct(prev, next)).toBe(0)
  })

  it('returns 0 when the tick delta itself is negative (counter reset)', () => {
    const prev = { utime: 500, stime: 0, at: 0 }
    const next = { utime: 100, stime: 0, at: 1000 }
    expect(computeProcessCpuPct(prev, next)).toBe(0)
  })
})
