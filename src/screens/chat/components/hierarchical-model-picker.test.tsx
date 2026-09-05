// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { HierarchicalModelPicker } from './hierarchical-model-picker'
import type { HierarchicalModelItem } from './model-hierarchy'

describe('HierarchicalModelPicker Component', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const mockModels: HierarchicalModelItem[] = [
    { id: 'vps/ag/gemini-2.5-flash', name: 'gemini-2.5-flash', provider: 'custom' },
    { id: 'vps/ag/claude-sonnet-4-6', name: 'claude-sonnet-4-6', provider: 'custom' },
    { id: 'hb/gemini-pro', name: 'gemini-pro', provider: 'hb' },
    { id: 'gpt-4o', name: 'gpt-4o', provider: 'openai' },
  ]

  const mockIsCurrentModel = (active: string, id: string) => active === id

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

  it('renders top-level groups and bare items', async () => {
    await act(async () => {
      root.render(
        <HierarchicalModelPicker
          models={mockModels}
          activeModel=""
          isPinned={() => false}
          togglePin={() => {}}
          onSelectModel={() => {}}
          isCurrentModel={mockIsCurrentModel}
        />,
      )
    })

    expect(container.textContent).toContain('vps')
    expect(container.textContent).toContain('hb')
    expect(container.textContent).toContain('gpt-4o')
  })

  it('expands group on click to show nested children and handles selection', async () => {
    const onSelect = vi.fn()
    await act(async () => {
      root.render(
        <HierarchicalModelPicker
          models={mockModels}
          activeModel=""
          isPinned={() => false}
          togglePin={() => {}}
          onSelectModel={onSelect}
          isCurrentModel={mockIsCurrentModel}
        />,
      )
    })

    // Find hb group button
    const buttons = Array.from(container.querySelectorAll('button'))
    const hbButton = buttons.find((b) => b.textContent?.includes('hb'))
    expect(hbButton).toBeDefined()

    await act(async () => {
      hbButton?.click()
    })

    expect(container.textContent).toContain('gemini-pro')

    // Find gemini-pro button
    const updatedButtons = Array.from(container.querySelectorAll('button'))
    const geminiButton = updatedButtons.find((b) => b.textContent?.includes('gemini-pro'))
    expect(geminiButton).toBeDefined()

    await act(async () => {
      geminiButton?.click()
    })

    expect(onSelect).toHaveBeenCalledWith('hb/gemini-pro', 'hb')
  })

  it('filters models on search query', async () => {
    await act(async () => {
      root.render(
        <HierarchicalModelPicker
          models={mockModels}
          activeModel=""
          isPinned={() => false}
          togglePin={() => {}}
          onSelectModel={() => {}}
          isCurrentModel={mockIsCurrentModel}
        />,
      )
    })

    const input = container.querySelector('input')
    expect(input).toBeDefined()

    await act(async () => {
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set
        nativeInputValueSetter?.call(input, 'claude')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    expect(container.textContent).toContain('claude-sonnet-4-6')
  })
})
