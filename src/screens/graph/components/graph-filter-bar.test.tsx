// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraphFilterBar } from './graph-filter-bar'

vi.mock('@/lib/theme', () => ({
  useCurrentTheme: () => ({ theme: 'dark', isDark: true }),
}))

describe('GraphFilterBar', () => {
  it('renders category toggle pills with counts and fires onToggleCategory', () => {
    const onToggle = vi.fn()
    render(
      <GraphFilterBar
        activeCategories={
          new Set(['concept', 'entity', 'project', 'skill', 'daily'])
        }
        counts={{ concept: 10, entity: 5, project: 3, skill: 8, daily: 12 }}
        onToggleCategory={onToggle}
      />,
    )

    expect(screen.getByText(/Concepts/i)).toBeDefined()
    expect(screen.getByText(/Skills/i)).toBeDefined()

    const skillPill = screen.getByRole('button', { name: /Skills/i })
    fireEvent.click(skillPill)
    expect(onToggle).toHaveBeenCalledWith('skill')
  })
})
