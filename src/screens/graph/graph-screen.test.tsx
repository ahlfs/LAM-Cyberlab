import { describe, it, expect } from 'vitest'
import { getNodeColor, getNodeRadius } from './graph-screen'

describe('Graph visual helpers', () => {
  it('returns correct color for each category', () => {
    expect(getNodeColor('concept', true)).toBe('#f8fafc')
    expect(getNodeColor('concept', false)).toBe('#0f172a')
    expect(getNodeColor('entity', true)).toBe('#2dd4bf')
    expect(getNodeColor('project', true)).toBe('#10b981')
    expect(getNodeColor('skill', true)).toBe('#f43f5e')
    expect(getNodeColor('daily', true)).toBe('#38bdf8')
  })

  it('computes proportional radius based on connection degree', () => {
    expect(getNodeRadius(0)).toBeGreaterThanOrEqual(4)
    expect(getNodeRadius(9)).toBeGreaterThan(getNodeRadius(1))
    expect(getNodeRadius(100)).toBeLessThanOrEqual(18)
  })
})
