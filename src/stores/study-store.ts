import { create } from 'zustand'

export type StudyResourceType = 'url' | 'doc' | 'audio' | 'text'
export type StudyResourceStatus = 'idle' | 'parsing' | 'ready' | 'analyzing' | 'ingested'

export type StudyResource = {
  id: string
  title: string
  type: StudyResourceType
  content: string
  size: number
  sourceUrl?: string
  status: StudyResourceStatus
  createdAt: string
}

export type StudyState = {
  resources: Array<StudyResource>
  activeResourceId: string | null
  isExtracting: boolean
  isAnalyzing: boolean
  isCommitting: boolean
  analysisOutput: string
  instructions: string

  // Actions
  addResource: (resource: StudyResource) => void
  removeResource: (id: string) => void
  updateResource: (id: string, updates: Partial<StudyResource>) => void
  setActiveResourceId: (id: string | null) => void
  setIsExtracting: (val: boolean) => void
  setIsAnalyzing: (val: boolean) => void
  setIsCommitting: (val: boolean) => void
  setAnalysisOutput: (output: string) => void
  appendAnalysisOutput: (chunk: string) => void
  setInstructions: (instructions: string) => void
  getActiveResource: () => StudyResource | undefined
  resetStore: () => void
}

export const useStudyStore = create<StudyState>((set, get) => ({
  resources: [],
  activeResourceId: null,
  isExtracting: false,
  isAnalyzing: false,
  isCommitting: false,
  analysisOutput: '',
  instructions: '',

  addResource: (resource) =>
    set((state) => {
      const exists = state.resources.some((r) => r.id === resource.id)
      const nextResources = exists
        ? state.resources.map((r) => (r.id === resource.id ? resource : r))
        : [resource, ...state.resources]
      return {
        resources: nextResources,
        activeResourceId: state.activeResourceId || resource.id,
      }
    }),

  removeResource: (id) =>
    set((state) => {
      const filtered = state.resources.filter((r) => r.id !== id)
      let nextActive = state.activeResourceId
      if (nextActive === id) {
        nextActive = filtered.length > 0 ? filtered[0].id : null
      }
      return {
        resources: filtered,
        activeResourceId: nextActive,
      }
    }),

  updateResource: (id, updates) =>
    set((state) => ({
      resources: state.resources.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),

  setActiveResourceId: (id) => set({ activeResourceId: id }),
  setIsExtracting: (val) => set({ isExtracting: val }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setIsCommitting: (val) => set({ isCommitting: val }),
  setAnalysisOutput: (output) => set({ analysisOutput: output }),
  appendAnalysisOutput: (chunk) =>
    set((state) => ({ analysisOutput: state.analysisOutput + chunk })),
  setInstructions: (instructions) => set({ instructions }),

  getActiveResource: () => {
    const { resources, activeResourceId } = get()
    return resources.find((r) => r.id === activeResourceId)
  },

  resetStore: () =>
    set({
      resources: [],
      activeResourceId: null,
      isExtracting: false,
      isAnalyzing: false,
      isCommitting: false,
      analysisOutput: '',
      instructions: '',
    }),
}))
