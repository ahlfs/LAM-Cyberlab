import { describe, expect, it } from 'vitest'
import { parseAmdSysfsInt, parseNvidiaSmiCsv } from './gpu-stats'

describe('parseNvidiaSmiCsv', () => {
  it('parses index, name, utilization, memory (MiB→bytes), and temp', () => {
    const sample = '0, NVIDIA GeForce RTX 3050 Mobile, 5, 1024, 4096, 45\n'
    const gpus = parseNvidiaSmiCsv(sample)
    expect(gpus).toEqual([
      {
        vendor: 'nvidia',
        index: 0,
        name: 'NVIDIA GeForce RTX 3050 Mobile',
        utilizationPct: 5,
        memUsedBytes: 1024 * 1024 * 1024,
        memTotalBytes: 4096 * 1024 * 1024,
        tempC: 45,
      },
    ])
  })

  it('parses multiple GPUs, one per line', () => {
    const sample = [
      '0, GPU A, 10, 500, 8192, 40',
      '1, GPU B, 90, 7000, 8192, 70',
    ].join('\n')
    const gpus = parseNvidiaSmiCsv(sample)
    expect(gpus).toHaveLength(2)
    expect(gpus[1].index).toBe(1)
    expect(gpus[1].name).toBe('GPU B')
  })

  it('skips blank lines and malformed rows', () => {
    const sample = ['', '0, GPU A, 10, 500, 8192, 40', 'garbage'].join('\n')
    expect(parseNvidiaSmiCsv(sample)).toHaveLength(1)
  })

  it('falls back to null for non-numeric fields (e.g. "[N/A]")', () => {
    const gpus = parseNvidiaSmiCsv('0, GPU A, [N/A], [N/A], [N/A], [N/A]')
    expect(gpus[0]).toMatchObject({
      utilizationPct: null,
      memUsedBytes: null,
      memTotalBytes: null,
      tempC: null,
    })
  })
})

describe('parseAmdSysfsInt', () => {
  it('parses a plain integer from sysfs text', () => {
    expect(parseAmdSysfsInt('42\n')).toBe(42)
  })

  it('returns null for non-numeric content', () => {
    expect(parseAmdSysfsInt('unknown\n')).toBeNull()
  })
})
