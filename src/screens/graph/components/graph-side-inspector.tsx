import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  Link01Icon,
  ArrowRight01Icon,
  SparklesIcon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons'
import { CATEGORY_CONFIG, type GraphCategory } from './graph-filter-bar'

export type InspectorNode = {
  id: string
  title: string
  type?: string
  tags?: string[]
}

type GraphSideInspectorProps = {
  selectedNode: InspectorNode | null
  inboundLinks: InspectorNode[]
  outboundLinks: InspectorNode[]
  onClose: () => void
  onSelectNode: (id: string) => void
  onOpenFull?: (id: string) => void
}

export const GraphSideInspector = memo(function GraphSideInspector({
  selectedNode,
  inboundLinks,
  outboundLinks,
  onClose,
  onSelectNode,
  onOpenFull,
}: GraphSideInspectorProps) {
  if (!selectedNode) return null

  const category = (selectedNode.type?.toLowerCase() ||
    'concept') as GraphCategory
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.concept

  return (
    <div
      className="absolute top-4 right-4 bottom-4 w-80 md:w-96 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden z-40 transition-all duration-200 select-none"
      style={{
        backgroundColor: 'var(--theme-card, rgba(15, 17, 23, 0.95))',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between shrink-0"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-bg, rgba(0,0,0,0.2))',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.color}90`,
            }}
          />
          <div className="min-w-0">
            <span
              className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-card2, rgba(255,255,255,0.04))',
                color: config.color,
              }}
            >
              {config.label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg transition-colors hover:bg-[var(--theme-card2)] opacity-70 hover:opacity-100"
          title="Close Inspector"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={15} />
        </button>
      </div>

      {/* Body: Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 font-sans select-text">
        <div>
          <h2
            className="text-base font-bold tracking-tight leading-snug"
            style={{ color: 'var(--theme-text)' }}
          >
            {selectedNode.title}
          </h2>
          <p
            className="text-[11px] font-mono mt-1 opacity-60 truncate"
            title={selectedNode.id}
          >
            {selectedNode.id}
          </p>
        </div>

        {selectedNode.tags && selectedNode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedNode.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md border font-mono"
                style={{
                  backgroundColor: 'var(--theme-card2, rgba(255,255,255,0.03))',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-muted)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Relations Section */}
        <div className="space-y-3 pt-2">
          {/* Outbound */}
          <div>
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
              <span>References ({outboundLinks.length})</span>
            </div>
            {outboundLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outboundLinks.map((target) => {
                  const targetCat = (target.type?.toLowerCase() ||
                    'concept') as GraphCategory
                  const targetConfig =
                    CATEGORY_CONFIG[targetCat] || CATEGORY_CONFIG.concept
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => onSelectNode(target.id)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor:
                          'var(--theme-card2, rgba(255,255,255,0.03))',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: targetConfig.color }}
                      />
                      <span className="truncate max-w-[180px]">
                        {target.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] italic opacity-50">
                No outbound connections
              </p>
            )}
          </div>

          {/* Inbound */}
          <div>
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={Link01Icon} size={13} />
              <span>Referenced By ({inboundLinks.length})</span>
            </div>
            {inboundLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {inboundLinks.map((source) => {
                  const sourceCat = (source.type?.toLowerCase() ||
                    'concept') as GraphCategory
                  const sourceConfig =
                    CATEGORY_CONFIG[sourceCat] || CATEGORY_CONFIG.concept
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => onSelectNode(source.id)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor:
                          'var(--theme-card2, rgba(255,255,255,0.03))',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: sourceConfig.color }}
                      />
                      <span className="truncate max-w-[180px]">
                        {source.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] italic opacity-50">
                No incoming backlinks
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {onOpenFull && (
        <div
          className="p-3 border-t shrink-0 flex items-center justify-end gap-2"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-bg, rgba(0,0,0,0.2))',
          }}
        >
          <button
            type="button"
            onClick={() => onOpenFull(selectedNode.id)}
            className="w-full py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-accent, #6366f1)',
              color: '#ffffff',
            }}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={14} />
            <span>Open Note in Knowledge Base</span>
          </button>
        </div>
      )}
    </div>
  )
})
