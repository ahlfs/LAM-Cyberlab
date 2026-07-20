import { describe, expect, it } from 'vitest'
import { appendScrollback } from './terminal-sessions'

describe('appendScrollback', () => {
  it('appends under the cap without truncating', () => {
    expect(appendScrollback('hello ', 'world', 100)).toBe('hello world')
  })

  it('truncates from the front once the cap is exceeded', () => {
    const result = appendScrollback('abc', 'defgh', 5)
    // 'abcdefgh' is 8 chars, capped to the last 5 -> 'defgh'
    expect(result).toBe('defgh')
    expect(result.length).toBe(5)
  })

  it('keeps only the tail across many small appends (rolling window)', () => {
    let buf = ''
    for (let i = 0; i < 20; i++) {
      buf = appendScrollback(buf, String(i).padStart(2, '0'), 10)
    }
    expect(buf.length).toBe(10)
    expect(buf).toBe('1516171819')
  })

  it('handles a single chunk larger than the cap by keeping only its tail', () => {
    const bigChunk = 'x'.repeat(1000) + 'END'
    const result = appendScrollback('', bigChunk, 10)
    expect(result).toBe('xxxxxxxEND')
    expect(result.length).toBe(10)
  })

  it('returns the chunk unchanged when starting empty and under cap', () => {
    expect(appendScrollback('', 'prompt$ ', 64 * 1024)).toBe('prompt$ ')
  })
})
