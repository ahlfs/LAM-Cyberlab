import { describe, expect, it } from 'vitest'
import {
  buildModelHierarchy,
  type HierarchicalModelItem,
  type HierarchicalModelGroup,
  filterModelHierarchy,
  getAncestorGroupPaths,
} from './model-hierarchy'

describe('buildModelHierarchy', () => {
  it('handles empty models list', () => {
    const tree = buildModelHierarchy([])
    expect(tree).toEqual([])
  })

  it('groups 3-level prefix: vps/ag/gemini-2.5-flash and vps/ag/claude-sonnet-4-6', () => {
    const models: HierarchicalModelItem[] = [
      { id: 'vps/ag/gemini-2.5-flash', name: 'gemini-2.5-flash', provider: 'custom' },
      { id: 'vps/ag/claude-sonnet-4-6', name: 'claude-sonnet-4-6', provider: 'custom' },
    ]
    const tree = buildModelHierarchy(models)
    expect(tree.length).toBe(1)
    const vps = tree[0] as HierarchicalModelGroup
    expect(vps.isGroup).toBe(true)
    expect(vps.name).toBe('vps')
    expect(vps.children.length).toBe(1)

    const ag = vps.children[0] as HierarchicalModelGroup
    expect(ag.isGroup).toBe(true)
    expect(ag.name).toBe('ag')
    expect(ag.children.length).toBe(2)

    const model1 = ag.children.find((c) => !c.isGroup && c.id === 'vps/ag/gemini-2.5-flash') as HierarchicalModelItem
    expect(model1).toBeDefined()
    expect(model1.isGroup).toBe(false)
    expect(model1.id).toBe('vps/ag/gemini-2.5-flash')
  })

  it('handles 4 or more prefixes: a/b/c/d/deep-model', () => {
    const models: HierarchicalModelItem[] = [
      { id: 'a/b/c/d/deep-model', name: 'deep-model', provider: 'custom' },
    ]
    const tree = buildModelHierarchy(models)
    expect(tree.length).toBe(1)
    let cur: any = tree[0]
    expect(cur.name).toBe('a')
    cur = cur.children[0]
    expect(cur.name).toBe('b')
    cur = cur.children[0]
    expect(cur.name).toBe('c')
    cur = cur.children[0]
    expect(cur.name).toBe('d')
    cur = cur.children[0]
    expect(cur.isGroup).toBe(false)
    expect(cur.id).toBe('a/b/c/d/deep-model')
  })

  it('handles model without prefix (bare model name) using direct item', () => {
    const models: HierarchicalModelItem[] = [
      { id: 'gpt-4o', name: 'gpt-4o', provider: 'openai' },
      { id: 'claude-3-5-sonnet', name: 'claude-3-5-sonnet', provider: 'anthropic' },
    ]
    const tree = buildModelHierarchy(models)
    expect(tree.length).toBe(2)
    expect(tree[0].isGroup).toBe(false)
    expect((tree[0] as HierarchicalModelItem).id).toBe('claude-3-5-sonnet')
    expect((tree[1] as HierarchicalModelItem).id).toBe('gpt-4o')
  })

  it('handles mixed bare models and multi-level prefix models', () => {
    const models: HierarchicalModelItem[] = [
      { id: 'gpt-4o', name: 'gpt-4o', provider: 'openai' },
      { id: 'hb/gemini-pro', name: 'gemini-pro', provider: 'hb' },
      { id: 'vps/ag/claude', name: 'claude', provider: 'vps' },
    ]
    const tree = buildModelHierarchy(models)
    const groups = tree.filter((t) => t.isGroup)
    const leaves = tree.filter((t) => !t.isGroup)

    expect(groups.length).toBe(2)
    expect(leaves.length).toBe(1)
    expect((leaves[0] as HierarchicalModelItem).id).toBe('gpt-4o')
  })

  it('filters model hierarchy with search query across any level or leaf', () => {
    const models: HierarchicalModelItem[] = [
      { id: 'vps/ag/gemini-2.5-flash', name: 'gemini-2.5-flash', provider: 'custom' },
      { id: 'vps/ag/claude-sonnet-4-6', name: 'claude-sonnet-4-6', provider: 'custom' },
      { id: 'hb/gemini-pro', name: 'gemini-pro', provider: 'hb' },
      { id: 'gpt-4o', name: 'gpt-4o', provider: 'openai' },
    ]
    const tree = buildModelHierarchy(models)

    const filteredGemini = filterModelHierarchy(tree, 'gemini')
    expect(filteredGemini.length).toBe(2)

    const filteredVps = filterModelHierarchy(tree, 'vps')
    expect(filteredVps.length).toBe(1)
    expect((filteredVps[0] as HierarchicalModelGroup).children[0].name).toBe('ag')
  })

  it('extracts ancestor group paths correctly', () => {
    expect(getAncestorGroupPaths('vps/ag/gemini-2.5-flash')).toEqual(['vps', 'vps/ag'])
    expect(getAncestorGroupPaths('gpt-4o')).toEqual([])
    expect(getAncestorGroupPaths('a/b/c/d/model')).toEqual(['a', 'a/b', 'a/b/c', 'a/b/c/d'])
  })
})
