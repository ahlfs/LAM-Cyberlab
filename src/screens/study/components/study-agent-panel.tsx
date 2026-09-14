import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SparklesIcon,
  Bookmark02Icon,
  Loading03Icon,
  CheckmarkCircle01Icon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons'
import { Markdown } from '@/components/prompt-kit/markdown'
import { useStudyStore } from '@/stores/study-store'

export function StudyAgentPanel() {
  const {
    getActiveResource,
    isAnalyzing,
    isCommitting,
    analysisOutput,
    instructions,
    setIsAnalyzing,
    setIsCommitting,
    setAnalysisOutput,
    appendAnalysisOutput,
    setInstructions,
  } = useStudyStore()

  const [commitStatus, setCommitStatus] = useState<{
    success?: boolean
    path?: string
    msg?: string
  } | null>(null)

  const activeResource = getActiveResource()

  const handleStartAnalysis = async () => {
    if (!activeResource || !activeResource.content) return

    setIsAnalyzing(true)
    setAnalysisOutput('')
    setCommitStatus(null)

    try {
      const response = await fetch('/api/study/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeResource.title,
          content: activeResource.content,
          instructions:
            instructions ||
            'Extract core concepts, definitions, and takeaways.',
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Analysis failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim()
            if (rawData === '[DONE]') break

            try {
              const parsed = JSON.parse(rawData)
              if (parsed.event === 'text_delta' && parsed.data?.text) {
                appendAnalysisOutput(parsed.data.text)
              } else if (
                parsed.event === 'content_block_delta' &&
                parsed.data?.delta?.text
              ) {
                appendAnalysisOutput(parsed.data.delta.text)
              } else if (parsed.data?.delta?.text) {
                appendAnalysisOutput(parsed.data.delta.text)
              }
            } catch {
              // ignore parse errors on fragmented SSE lines
            }
          }
        }
      }
    } catch (err: any) {
      setAnalysisOutput(`**Error during analysis:** ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCommitToSecondBrain = async (useRawContent = false) => {
    if (!activeResource) return
    if (!useRawContent && !analysisOutput) return

    setIsCommitting(true)
    setCommitStatus(null)

    const contentToCommit = useRawContent
      ? activeResource.content
      : analysisOutput

    try {
      const response = await fetch('/api/study/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeResource.title,
          content: contentToCommit,
          tags: ['study', 'hermes-learning', activeResource.type],
          sourceUrl: activeResource.sourceUrl,
        }),
      })

      const result = await response.json()
      if (result.ok && result.data) {
        setCommitStatus({
          success: true,
          path: result.data.filePath,
          msg: 'Note saved & Second Brain sync triggered successfully.',
        })
      } else {
        setCommitStatus({
          success: false,
          msg: result.error || 'Failed to commit note.',
        })
      }
    } catch (err: any) {
      setCommitStatus({
        success: false,
        msg: `Error: ${err.message}`,
      })
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Topbar: Consistent Height with Editor */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-b px-4"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-card)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="p-1.5 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-accent, #6366f1)',
            }}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={16} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
              style={{ color: 'var(--theme-text)' }}
            >
              Hermes Study Agent
              {isAnalyzing && (
                <span
                  className="flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full border normal-case"
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-accent, #6366f1)',
                    color: 'var(--theme-accent, #6366f1)',
                  }}
                >
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={12}
                    className="animate-spin"
                  />
                  Analyzing
                </span>
              )}
            </h2>
            <p
              className="text-[11px] truncate mt-0.5"
              style={{ color: 'var(--theme-muted)' }}
            >
              Target:{' '}
              <span
                className="font-mono font-medium"
                style={{ color: 'var(--theme-text)' }}
              >
                {activeResource ? activeResource.title : 'No resource selected'}
              </span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!activeResource || isAnalyzing}
            className="text-xs px-3 py-1.5 font-medium rounded-lg flex items-center gap-1.5 transition-opacity disabled:opacity-40 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-accent, #6366f1)',
              color: '#ffffff',
            }}
          >
            {isAnalyzing ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={13}
                  className="animate-spin"
                />
                Studying...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={SparklesIcon} size={13} />
                Analyze Resource
              </>
            )}
          </button>

          {analysisOutput && (
            <button
              type="button"
              onClick={() => handleCommitToSecondBrain(false)}
              disabled={isCommitting || isAnalyzing}
              className="text-xs px-3 py-1.5 font-medium rounded-lg border flex items-center gap-1.5 transition-colors shadow-sm"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-text)',
              }}
            >
              {isCommitting ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={13}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Bookmark02Icon} size={13} />
                  Commit Analysis
                </>
              )}
            </button>
          )}

          {activeResource && activeResource.content && (
            <button
              type="button"
              onClick={() => handleCommitToSecondBrain(true)}
              disabled={isCommitting || isAnalyzing}
              className="text-xs px-3 py-1.5 font-medium rounded-lg border flex items-center gap-1.5 transition-colors shadow-sm"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-muted)',
              }}
              title="Commit raw source content directly to Second Brain (skips LLM analysis, better for wiki ingest quality)"
            >
              <HugeiconsIcon icon={Bookmark02Icon} size={13} />
              Commit Raw
            </button>
          )}
        </div>
      </div>

      {/* Analysis Stream / Content Area: Stretches cleanly */}
      <div
        className="flex flex-1 min-h-0 w-full flex-col overflow-y-auto p-6 font-sans text-sm select-text leading-relaxed"
        style={{
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)',
        }}
      >
        {commitStatus && (
          <div
            className="mb-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 shrink-0"
            style={{
              backgroundColor: commitStatus.success
                ? 'color-mix(in srgb, var(--theme-accent, #10b981) 15%, var(--theme-bg))'
                : 'color-mix(in srgb, #ef4444 15%, var(--theme-bg))',
              borderColor: commitStatus.success
                ? 'var(--theme-accent, #10b981)'
                : '#ef4444',
              color: 'var(--theme-text)',
            }}
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
            <div className="flex-1">
              <p className="font-semibold">{commitStatus.msg}</p>
              {commitStatus.path && (
                <p className="font-mono text-[11px] opacity-80 mt-0.5">
                  {commitStatus.path}
                </p>
              )}
            </div>
          </div>
        )}

        {analysisOutput ? (
          <div className="prose max-w-none flex-1">
            <Markdown>{analysisOutput}</Markdown>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-6 my-auto">
            <div
              className="flex size-16 items-center justify-center rounded-2xl border mb-3 shadow-sm"
              style={{
                backgroundColor: 'var(--theme-card)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-accent, #6366f1)',
              }}
            >
              <HugeiconsIcon icon={SparklesIcon} size={28} />
            </div>
            <h3
              className="text-base font-bold"
              style={{ color: 'var(--theme-text)' }}
            >
              Ready to Extract Knowledge
            </h3>
            <p
              className="text-xs mt-1 max-w-xs leading-relaxed"
              style={{ color: 'var(--theme-muted)' }}
            >
              Select or stage a resource on the left, add optional focus
              instructions below, and click
              <strong style={{ color: 'var(--theme-text)' }}>
                {' '}
                Analyze Resource
              </strong>{' '}
              to start interactive learning.
            </p>
          </div>
        )}
      </div>

      {/* Focus Instructions Footer: Pinned at bottom */}
      <div
        className="flex h-14 shrink-0 items-center border-t px-4"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-card)',
        }}
      >
        <input
          placeholder="Focus instructions (e.g. Extract architectural patterns, highlight key commands)..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isAnalyzing}
          className="flex-1 text-xs rounded-lg px-3 py-2 outline-none transition-colors border"
          style={{
            backgroundColor: 'var(--theme-bg)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        />
      </div>
    </div>
  )
}
