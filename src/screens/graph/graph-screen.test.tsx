import { describe, it, expect } from 'vitest'
import { getNodeColor, getNodeRadius } from './graph-screen'

describe('Graph visual helpers', () => {
  it('correctly maps unified categories to Obsidian dark color palette', () => {
    expect(getNodeColor('concept')).toBe('#f8fafc')
    expect(getNodeColor('entity')).toBe('#2dd4bf')
    expect(getNodeColor('project')).toBe('#10b981')
    expect(getNodeColor('skill')).toBe('#f43f5e')
    expect(getNodeColor('daily')).toBe('#38bdf8')
  })

  it('computes proportional radius based on connection degree', () => {
    expect(getNodeRadius(0)).toBeGreaterThanOrEqual(4)
    expect(getNodeRadius(9)).toBeGreaterThan(getNodeRadius(1))
    expect(getNodeRadius(100)).toBeLessThanOrEqual(18)
  })
})
