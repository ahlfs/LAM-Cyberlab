import { describe, it, expect, beforeEach } from 'vitest'
import { useStudyStore } from './study-store'

describe('useStudyStore', () => {
  beforeEach(() => {
    useStudyStore.getState().resetStore()
  })

  it('initializes with default empty state', () => {
    const state = useStudyStore.getState()
    expect(state.resources).toEqual([])
    expect(state.activeResourceId).toBeNull()
    expect(state.isExtracting).toBe(false)
    expect(state.isAnalyzing).toBe(false)
    expect(state.isCommitting).toBe(false)
    expect(state.analysisOutput).toBe('')
  })

  it('adds and selects a resource', () => {
    const resource = {
      id: 'res-1',
      title: 'Guide to Reverse Engineering',
      type: 'url' as const,
      content: '# Full Guide content',
      size: 500,
      sourceUrl: 'https://example.com/re',
      status: 'ready' as const,
      createdAt: new Date().toISOString(),
    }

    useStudyStore.getState().addResource(resource)
    const state = useStudyStore.getState()
    expect(state.resources.length).toBe(1)
    expect(state.activeResourceId).toBe('res-1')
    expect(state.getActiveResource()?.title).toBe(
      'Guide to Reverse Engineering',
    )
  })

  it('removes a resource and updates active selection', () => {
    const res1 = {
      id: 'res-1',
      title: 'First',
      type: 'doc' as const,
      content: 'Content 1',
      size: 100,
      status: 'ready' as const,
      createdAt: new Date().toISOString(),
    }
    const res2 = {
      id: 'res-2',
      title: 'Second',
      type: 'doc' as const,
      content: 'Content 2',
      size: 200,
      status: 'ready' as const,
      createdAt: new Date().toISOString(),
    }

    useStudyStore.getState().addResource(res1)
    useStudyStore.getState().addResource(res2)
    useStudyStore.getState().setActiveResourceId('res-1')

    useStudyStore.getState().removeResource('res-1')
    const state = useStudyStore.getState()
    expect(state.resources.length).toBe(1)
    expect(state.activeResourceId).toBe('res-2')
  })

  it('updates analysis stream and status', () => {
    useStudyStore.getState().setIsAnalyzing(true)
    useStudyStore.getState().appendAnalysisOutput('Key concept: ')
    useStudyStore.getState().appendAnalysisOutput('Reverse Engineering')

    const state = useStudyStore.getState()
    expect(state.isAnalyzing).toBe(true)
    expect(state.analysisOutput).toBe('Key concept: Reverse Engineering')
  })
})
