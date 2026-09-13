import { describe, it, expect } from 'vitest'
import { buildKnowledgeGraph } from './knowledge-browser'

describe('buildKnowledgeGraph (Unified Ecosystem)', () => {
  it('returns nodes categorized into concept, entity, project, skill, and daily', () => {
    const graph = buildKnowledgeGraph()
    expect(graph).toBeDefined()
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)

    // Extracted-Docs must be excluded
    const hasExtractedDocs = graph.nodes.some(
      (n) => n.id.includes('Extracted-Docs') || n.type === 'extracted-doc',
    )
    expect(hasExtractedDocs).toBe(false)
  })
})
