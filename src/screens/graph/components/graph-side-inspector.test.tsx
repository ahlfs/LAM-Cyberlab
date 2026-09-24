// @vitest-environment jsdom
import React from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi } from 'vitest'
import { GraphSideInspector } from './graph-side-inspector'

vi.mock('@/lib/theme', () => ({
  useCurrentTheme: () => ({ theme: 'dark', isDark: true }),
}))

describe('GraphSideInspector', () => {
  it('renders node title and relations when node is selected', async () => {
    const onSelectNode = vi.fn()
    const onClose = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await React.act(async () => {
      root.render(
        <GraphSideInspector
          selectedNode={{
            id: '04-Wiki/Concepts/Docker.md',
            title: 'Docker',
            type: 'concept',
            tags: ['devops'],
          }}
          inboundLinks={[
            {
              id: '05-Projects/LAM-Router.md',
              title: 'LAM-Router',
              type: 'project',
            },
          ]}
          outboundLinks={[
            {
              id: '04-Wiki/Entities/Linux.md',
              title: 'Linux',
              type: 'entity',
            },
          ]}
          onClose={onClose}
          onSelectNode={onSelectNode}
          onOpenFull={vi.fn()}
        />,
      )
    })

    expect(container.textContent).toContain('Docker')
    expect(container.textContent).toContain('LAM-Router')
    expect(container.textContent).toContain('Linux')

    const projectBadge = container.querySelector(
      'button[title="05-Projects/LAM-Router.md"]',
    ) as HTMLElement | null
    if (projectBadge) {
      projectBadge.click()
      expect(onSelectNode).toHaveBeenCalledWith('05-Projects/LAM-Router.md')
    }

    const closeBtn = container.querySelector(
      'button[title="Close Inspector"]',
    ) as HTMLElement | null
    if (closeBtn) {
      closeBtn.click()
      expect(onClose).toHaveBeenCalled()
    }

    root.unmount()
    container.remove()
  })
})
