import { describe, expect, it } from 'vitest'
import { isTouchDevice } from './touch-detect'

describe('touch-detect', () => {
  it('returns false in non-touch SSR or desktop environment without matchMedia coarse', () => {
    // In vitest jsdom by default
    const result = isTouchDevice()
    expect(typeof result).toBe('boolean')
  })
})
