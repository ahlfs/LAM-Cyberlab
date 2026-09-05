// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MobileTerminalInput } from './mobile-terminal-input'

// Mock terminal store
vi.mock('@/stores/terminal-panel-store', () => ({
  useTerminalPanelStore: {
    getState: () => ({
      tabs: [{ id: 'tab-1', sessionId: 'sess-123' }],
      activeTabId: 'tab-1',
    }),
  },
}))

describe('MobileTerminalInput', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders accessory keys (ESC, TAB, CTRL, ALT, Arrows, etc)', async () => {
    await act(async () => {
      root.render(<MobileTerminalInput />)
    })
    expect(container.textContent).toContain('ESC')
    expect(container.textContent).toContain('TAB')
    expect(container.textContent).toContain('CTRL')
    expect(container.textContent).toContain('ALT')
    expect(container.textContent).toContain('^C')
    expect(container.textContent).toContain('^D')
    expect(container.textContent).toContain('^Z')
  })

  it('toggles extra keys visibility', async () => {
    await act(async () => {
      root.render(<MobileTerminalInput />)
    })
    const toggleBtn = container.querySelector('button[aria-label="Toggle Extra Keys"]') as HTMLButtonElement
    expect(container.textContent).toContain('ESC')
    
    await act(async () => {
      toggleBtn.click()
    })
    expect(container.textContent).not.toContain('ESC')

    await act(async () => {
      toggleBtn.click()
    })
    expect(container.textContent).toContain('ESC')
  })

  it('toggles CTRL modifier sticky state', async () => {
    await act(async () => {
      root.render(<MobileTerminalInput />)
    })
    const buttons = Array.from(container.querySelectorAll('button'))
    const ctrlBtn = buttons.find((b) => b.textContent?.trim() === 'CTRL')
    expect(ctrlBtn).toBeDefined()

    const input = container.querySelector('input') as HTMLInputElement
    expect(input.placeholder).toContain('Type terminal command')

    await act(async () => {
      ctrlBtn?.click()
    })
    expect(input.placeholder).toContain('CTRL active')

    await act(async () => {
      ctrlBtn?.click()
    })
    expect(input.placeholder).toContain('Type terminal command')
  })
})
