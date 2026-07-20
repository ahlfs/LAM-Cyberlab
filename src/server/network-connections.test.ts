import { describe, expect, it } from 'vitest'
import { parseProcNetTcp } from './network-connections'

describe('parseProcNetTcp (IPv4)', () => {
  const header =
    '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode'

  it('decodes little-endian hex IP:port and maps state codes', () => {
    const line =
      '   0: 0100007F:239F 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 0000000000000000 100 0 0 10 0'
    const rows = parseProcNetTcp([header, line].join('\n'), 'tcp')
    expect(rows).toEqual([
      {
        protocol: 'tcp',
        localAddress: '127.0.0.1',
        localPort: 9119,
        remoteAddress: '0.0.0.0',
        remotePort: 0,
        state: 'LISTEN',
        inode: 12345,
      },
    ])
  })

  it('recognizes an ESTABLISHED connection to a remote peer', () => {
    // local 10.0.0.5:443 <- remote 93.184.216.34:52341
    const line =
      '   1: 0500000A:01BB 22D8B85D:CC75 01 00000000:00000000 00:00000000 00000000  1000        0 54321 1 0000000000000000 100 0 0 10 0'
    const rows = parseProcNetTcp([header, line].join('\n'), 'tcp')
    expect(rows[0].state).toBe('ESTABLISHED')
    expect(rows[0].localAddress).toBe('10.0.0.5')
    expect(rows[0].localPort).toBe(443)
    expect(rows[0].remoteAddress).toBe('93.184.216.34')
    expect(rows[0].remotePort).toBe(52341)
  })

  it('skips the header line and malformed rows', () => {
    expect(parseProcNetTcp(header, 'tcp')).toHaveLength(0)
    expect(parseProcNetTcp('garbage\nmore garbage', 'tcp')).toHaveLength(0)
  })
})

describe('parseProcNetTcp (IPv6)', () => {
  it('decodes the loopback address ::1', () => {
    // ::1 => 00000000 00000000 00000000 01000000 (last word little-endian → ...0001)
    const line =
      '   0: 00000000000000000000000001000000:1F90 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 99 1 0000000000000000 100 0 0 10 0'
    const rows = parseProcNetTcp(line, 'tcp6')
    expect(rows[0].localAddress).toBe('::1')
    expect(rows[0].localPort).toBe(8080)
  })

  it('decodes the unspecified address :: with zero-run compression', () => {
    const line =
      '   0: 00000000000000000000000000000000:0050 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 7 1 0000000000000000 100 0 0 10 0'
    const rows = parseProcNetTcp(line, 'tcp6')
    expect(rows[0].localAddress).toBe('::')
  })
})
