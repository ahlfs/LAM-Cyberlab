import { describe, it, expect } from 'vitest'
import { useStudyStore } from '@/stores/study-store'

describe('Study UI Store & Component contracts', () => {
  it('handles full lifecycle of study session state', () => {
    const store = useStudyStore.getState()
    store.resetStore()

    // 1. Stage resource
    store.addResource({
      id: 'res-study-1',
      title: 'Advanced Binary Reversing',
      type: 'doc',
      content: 'Binary analysis and decompilation guide',
      size: 1024,
      status: 'ready',
      createdAt: new Date().toISOString(),
    })

    expect(useStudyStore.getState().resources.length).toBe(1)
    expect(useStudyStore.getState().activeResourceId).toBe('res-study-1')

    // 2. Set analysis state
    store.setIsAnalyzing(true)
    store.appendAnalysisOutput('## Key Concepts\n- Symbol recovery')
    expect(useStudyStore.getState().isAnalyzing).toBe(true)
    expect(useStudyStore.getState().analysisOutput).toContain('Symbol recovery')

    // 3. Complete analysis
    store.setIsAnalyzing(false)
    expect(useStudyStore.getState().isAnalyzing).toBe(false)
  })
})
