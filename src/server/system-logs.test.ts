import { describe, expect, it } from 'vitest'
import { parseJournalctlJson } from './system-logs'

describe('parseJournalctlJson', () => {
  it('parses timestamp (µs→ms), priority, unit, and message', () => {
    const line = JSON.stringify({
      __REALTIME_TIMESTAMP: '1700000000123456',
      PRIORITY: '3',
      _SYSTEMD_UNIT: 'caddy.service',
      MESSAGE: 'listen tcp :443: address already in use',
    })
    const entries = parseJournalctlJson(line)
    expect(entries).toEqual([
      {
        timestampMs: 1700000000123,
        priority: 3,
        unit: 'caddy.service',
        message: 'listen tcp :443: address already in use',
      },
    ])
  })

  it('falls back to SYSLOG_IDENTIFIER when _SYSTEMD_UNIT is absent', () => {
    const line = JSON.stringify({
      __REALTIME_TIMESTAMP: '1700000000000000',
      PRIORITY: '6',
      SYSLOG_IDENTIFIER: 'sudo',
      MESSAGE: 'session opened',
    })
    expect(parseJournalctlJson(line)[0].unit).toBe('sudo')
  })

  it('decodes a non-UTF8 MESSAGE byte array', () => {
    const bytes = Array.from(Buffer.from('hello', 'utf-8'))
    const line = JSON.stringify({
      __REALTIME_TIMESTAMP: '1700000000000000',
      MESSAGE: bytes,
    })
    expect(parseJournalctlJson(line)[0].message).toBe('hello')
  })

  it('parses multiple lines (JSONL, not a JSON array)', () => {
    const lines = [
      JSON.stringify({ __REALTIME_TIMESTAMP: '1000000', MESSAGE: 'first' }),
      JSON.stringify({ __REALTIME_TIMESTAMP: '2000000', MESSAGE: 'second' }),
    ].join('\n')
    const entries = parseJournalctlJson(lines)
    expect(entries.map((e) => e.message)).toEqual(['first', 'second'])
  })

  it('skips malformed lines and entries missing a usable timestamp', () => {
    const lines = [
      'not json',
      JSON.stringify({ MESSAGE: 'no timestamp field' }),
      JSON.stringify({ __REALTIME_TIMESTAMP: '3000000', MESSAGE: 'ok' }),
    ].join('\n')
    const entries = parseJournalctlJson(lines)
    expect(entries).toHaveLength(1)
    expect(entries[0].message).toBe('ok')
  })

  it('reports null priority when PRIORITY is absent', () => {
    const line = JSON.stringify({
      __REALTIME_TIMESTAMP: '1000000',
      MESSAGE: 'no priority',
    })
    expect(parseJournalctlJson(line)[0].priority).toBeNull()
  })
})
