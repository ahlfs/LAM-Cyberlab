import { memo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  Link01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  if (!selectedNode) return null

  const category = (selectedNode.type?.toLowerCase() ||
    'concept') as GraphCategory
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.concept

  return (
    <div
      className={`absolute inset-x-3 bottom-3 top-auto md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-96 rounded-xl md:rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden z-40 transition-all duration-250 ease-out select-none ${
        isMobileExpanded ? 'max-h-[70vh]' : 'max-h-[140px] md:max-h-none'
      }`}
      style={{
        backgroundColor: 'var(--theme-card, rgba(15, 17, 23, 0.95))',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Header */}
      <div
        className="px-3.5 py-2 md:px-4 md:py-3.5 border-b flex items-center justify-between shrink-0"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-bg, rgba(0,0,0,0.2))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="size-2 md:size-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.color}90`,
            }}
          />
          <span
            className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0"
            style={{
              borderColor: 'var(--theme-border)',
              backgroundColor: 'var(--theme-card2, rgba(255,255,255,0.04))',
              color: config.color,
            }}
          >
            {config.label}
          </span>
          <h2
            className="text-xs md:text-base font-bold tracking-tight truncate flex-1 md:hidden"
            style={{ color: 'var(--theme-text)' }}
            title={selectedNode.title}
          >
            {selectedNode.title}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Expand / Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className="md:hidden p-1 rounded-lg transition-colors hover:bg-[var(--theme-card2)] opacity-70 hover:opacity-100"
            title={isMobileExpanded ? 'Collapse card' : 'Expand card details'}
          >
            <HugeiconsIcon
              icon={isMobileExpanded ? ArrowDown01Icon : ArrowUp01Icon}
              size={14}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--theme-card2)] opacity-70 hover:opacity-100"
            title="Close Inspector"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      </div>

      {/* Body: Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-2.5 md:space-y-4 font-sans select-text scrollbar-thin">
        <div className="hidden md:block">
          <h2
            className="text-base font-bold tracking-tight leading-snug"
            style={{ color: 'var(--theme-text)' }}
          >
            {selectedNode.title}
          </h2>
          <p
            className="text-[11px] font-mono mt-0.5 opacity-60 truncate"
            title={selectedNode.id}
          >
            {selectedNode.id}
          </p>
        </div>

        {/* Compact ID & Tags on Mobile */}
        <div className="flex items-center justify-between gap-2 md:hidden">
          <p
            className="text-[10px] font-mono opacity-60 truncate flex-1"
            title={selectedNode.id}
          >
            {selectedNode.id}
          </p>
        </div>

        {selectedNode.tags && selectedNode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {selectedNode.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-md border font-mono"
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

        {/* Relations Section (Expanded on Mobile or Default on Desktop) */}
        <div
          className={`space-y-2.5 pt-1 ${
            isMobileExpanded ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Outbound */}
          <div>
            <div
              className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
              <span>References ({outboundLinks.length})</span>
            </div>
            {outboundLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1 md:gap-1.5">
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
                      className="inline-flex items-center gap-1.5 text-[11px] md:text-xs px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                      <span className="truncate max-w-[140px] sm:max-w-[180px]">
                        {target.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[10px] md:text-[11px] italic opacity-50">
                No outbound connections
              </p>
            )}
          </div>

          {/* Inbound */}
          <div>
            <div
              className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={Link01Icon} size={12} />
              <span>Referenced By ({inboundLinks.length})</span>
            </div>
            {inboundLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1 md:gap-1.5">
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
                      className="inline-flex items-center gap-1.5 text-[11px] md:text-xs px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                      <span className="truncate max-w-[140px] sm:max-w-[180px]">
                        {source.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[10px] md:text-[11px] italic opacity-50">
                No incoming backlinks
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {onOpenFull && (
        <div
          className="p-2 md:p-3 border-t shrink-0 flex items-center justify-end gap-2"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-bg, rgba(0,0,0,0.2))',
          }}
        >
          <button
            type="button"
            onClick={() => onOpenFull(selectedNode.id)}
            className="w-full py-1.5 md:py-2 px-3 text-[11px] md:text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-accent, #6366f1)',
              color: '#ffffff',
            }}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={13} />
            <span>Open Note in Knowledge Base</span>
          </button>
        </div>
      )}
    </div>
  )
})
