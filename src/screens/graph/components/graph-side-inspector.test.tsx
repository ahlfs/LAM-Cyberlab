// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraphSideInspector } from './graph-side-inspector'

describe('GraphSideInspector', () => {
  it('renders node title and relations when node is selected', () => {
    const onSelectNode = vi.fn()
    const onClose = vi.fn()
    render(
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

    expect(screen.getByText('Docker')).toBeDefined()
    expect(screen.getByText('LAM-Router')).toBeDefined()
    expect(screen.getByText('Linux')).toBeDefined()

    const projectBadge = screen.getByText('LAM-Router')
    fireEvent.click(projectBadge)
    expect(onSelectNode).toHaveBeenCalledWith('05-Projects/LAM-Router.md')

    const closeBtn = screen.getByTitle('Close Inspector')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
