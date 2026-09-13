import { useState, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Link01Icon,
  File01Icon,
  Mic01Icon,
  Delete02Icon,
  ViewIcon,
  Loading03Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStudyStore, type StudyResource } from '@/stores/study-store'
import { ResourcePreviewDialog } from './resource-preview-dialog'

export function ResourceStage() {
  const [tab, setTab] = useState<'link' | 'file' | 'audio'>('link')
  const [urlInput, setUrlInput] = useState('')
  const [previewResource, setPreviewResource] = useState<StudyResource | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const {
    resources,
    activeResourceId,
    isExtracting,
    addResource,
    removeResource,
    setActiveResourceId,
    setIsExtracting,
  } = useStudyStore()

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return
    setIsExtracting(true)
    try {
      const res = await fetch('/api/study/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (data.ok && data.data) {
        const newResource: StudyResource = {
          id: `res-${Date.now()}`,
          title: data.data.title || 'Web Resource',
          type: 'url',
          content: data.data.content || '',
          size: data.data.size || 0,
          sourceUrl: data.data.sourceUrl,
          status: 'ready',
          createdAt: new Date().toISOString(),
        }
        addResource(newResource)
        setUrlInput('')
      } else {
        alert(data.error || 'Failed to extract URL')
      }
    } catch (err: any) {
      alert(`Error fetching URL: ${err.message}`)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/study/extract', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.ok && data.data) {
        const newResource: StudyResource = {
          id: `res-${Date.now()}`,
          title: data.data.title || file.name,
          type: 'doc',
          content: data.data.content || '',
          size: data.data.size || file.size,
          status: 'ready',
          createdAt: new Date().toISOString(),
        }
        addResource(newResource)
      } else {
        alert(data.error || 'Failed to extract document')
      }
    } catch (err: any) {
      alert(`Error uploading file: ${err.message}`)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleAudioUpload = async (file: File) => {
    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.ok && data.text) {
        const newResource: StudyResource = {
          id: `res-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: 'audio',
          content: data.text,
          size: file.size,
          status: 'ready',
          createdAt: new Date().toISOString(),
        }
        addResource(newResource)
      } else {
        alert(data.error || 'Failed to transcribe audio')
      }
    } catch (err: any) {
      alert(`Error transcribing audio: ${err.message}`)
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full border-r select-none"
      style={{
        backgroundColor: 'var(--theme-bg)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-bg)',
        }}
      >
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--theme-text)' }}
          >
            Resource Staging
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-muted)' }}>
            Stage articles, files, or audio for study
          </p>
        </div>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-mono border"
          style={{
            backgroundColor: 'var(--theme-card)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          {resources.length} Staged
        </span>
      </div>

      {/* Input Selection Tabs */}
      <div
        className="p-3 border-b"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-card)',
        }}
      >
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl border"
          style={{
            backgroundColor: 'var(--theme-bg)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('link')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor:
                tab === 'link' ? 'var(--theme-card)' : 'transparent',
              color:
                tab === 'link' ? 'var(--theme-text)' : 'var(--theme-muted)',
              border:
                tab === 'link' ? '1px solid var(--theme-border)' : '1px solid transparent',
            }}
          >
            <HugeiconsIcon icon={Link01Icon} size={14} />
            Web Link
          </button>
          <button
            type="button"
            onClick={() => setTab('file')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor:
                tab === 'file' ? 'var(--theme-card)' : 'transparent',
              color:
                tab === 'file' ? 'var(--theme-text)' : 'var(--theme-muted)',
              border:
                tab === 'file' ? '1px solid var(--theme-border)' : '1px solid transparent',
            }}
          >
            <HugeiconsIcon icon={File01Icon} size={14} />
            Document
          </button>
          <button
            type="button"
            onClick={() => setTab('audio')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor:
                tab === 'audio' ? 'var(--theme-card)' : 'transparent',
              color:
                tab === 'audio' ? 'var(--theme-text)' : 'var(--theme-muted)',
              border:
                tab === 'audio' ? '1px solid var(--theme-border)' : '1px solid transparent',
            }}
          >
            <HugeiconsIcon icon={Mic01Icon} size={14} />
            Voice/Audio
          </button>
        </div>

        {/* Tab Forms */}
        <div className="mt-3">
          {tab === 'link' && (
            <div className="flex items-center gap-2">
              <input
                placeholder="https://docs.example.com/guide..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                disabled={isExtracting}
                className="flex-1 text-xs rounded-xl px-3 py-2 outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-bg)',
                  borderColor: 'var(--theme-border)',
                  borderWidth: 1,
                  color: 'var(--theme-text)',
                }}
              />
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isExtracting || !urlInput.trim()}
                className="text-xs px-3.5 py-2 font-medium rounded-xl shrink-0 transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--theme-accent, #6366f1)',
                  color: '#ffffff',
                }}
              >
                {isExtracting ? (
                  <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                ) : (
                  'Fetch'
                )}
              </button>
            </div>
          )}

          {tab === 'file' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.txt,.docx,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: 'var(--theme-border)',
                  backgroundColor: 'var(--theme-bg)',
                }}
              >
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>
                  {isExtracting ? 'Extracting document...' : 'Click to select Markdown, TXT, PDF, DOCX'}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-muted)' }}>
                  Maximum size: 50 MB
                </p>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAudioUpload(file)
                }}
              />
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: 'var(--theme-border)',
                  backgroundColor: 'var(--theme-bg)',
                }}
              >
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>
                  {isExtracting ? 'Transcribing audio...' : 'Click to select Audio / Voice Memo'}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-muted)' }}>
                  Supported: MP3, WAV, M4A, WebM (up to 25 MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staged List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4" style={{ color: 'var(--theme-muted)' }}>
            <HugeiconsIcon icon={File01Icon} size={28} className="mb-2 opacity-50" />
            <p className="text-xs font-medium">No resources staged yet.</p>
            <p className="text-[11px] mt-1 opacity-80">
              Add a URL, file, or audio above to begin studying.
            </p>
          </div>
        ) : (
          resources.map((res) => {
            const isActive = activeResourceId === res.id
            return (
              <div
                key={res.id}
                onClick={() => setActiveResourceId(res.id)}
                className="p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2"
                style={{
                  backgroundColor: isActive ? 'var(--theme-card)' : 'var(--theme-bg)',
                  borderColor: isActive ? 'var(--theme-accent, #6366f1)' : 'var(--theme-border)',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="p-1.5 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--theme-card2, var(--theme-bg))',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                    >
                      {res.type === 'url' ? (
                        <HugeiconsIcon icon={Link01Icon} size={14} />
                      ) : res.type === 'audio' ? (
                        <HugeiconsIcon icon={Mic01Icon} size={14} />
                      ) : (
                        <HugeiconsIcon icon={File01Icon} size={14} />
                      )}
                    </span>
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                      {res.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeResource(res.id)
                    }}
                    className="p-1 rounded transition-colors hover:text-red-400"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--theme-muted)' }}>
                  <span>{(res.size / 1024).toFixed(1)} KB</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewResource(res)
                      }}
                      className="flex items-center gap-1 transition-colors hover:opacity-100"
                      style={{ color: 'var(--theme-muted)' }}
                    >
                      <HugeiconsIcon icon={ViewIcon} size={12} />
                      Preview
                    </button>
                    {isActive && (
                      <span
                        className="flex items-center gap-1 font-medium text-xs"
                        style={{ color: 'var(--theme-accent, #6366f1)' }}
                      >
                        Active
                        <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <ResourcePreviewDialog
        resource={previewResource}
        open={Boolean(previewResource)}
        onOpenChange={(open) => !open && setPreviewResource(null)}
      />
    </div>
  )
}
