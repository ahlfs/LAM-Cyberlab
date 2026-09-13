import { memo } from 'react'
import { cn } from '@/lib/utils'
import { useCurrentTheme } from '@/lib/theme'

export type GraphCategory = 'concept' | 'entity' | 'project' | 'skill' | 'daily'

export const CATEGORY_CONFIG: Record<
  GraphCategory,
  { label: string; color: string; dotClass: string }
> = {
  concept: {
    label: 'Concepts',
    color: '#f8fafc',
    dotClass: 'bg-[#f8fafc]',
  },
  entity: {
    label: 'Entities',
    color: '#2dd4bf',
    dotClass: 'bg-[#2dd4bf]',
  },
  project: {
    label: 'Projects',
    color: '#10b981',
    dotClass: 'bg-[#10b981]',
  },
  skill: {
    label: 'Skills',
    color: '#f43f5e',
    dotClass: 'bg-[#f43f5e]',
  },
  daily: {
    label: 'Daily',
    color: '#38bdf8',
    dotClass: 'bg-[#38bdf8]',
  },
}

type GraphFilterBarProps = {
  activeCategories: Set<string>
  counts: Record<string, number>
  onToggleCategory: (category: GraphCategory) => void
  getNodeColorDynamic?: (cat: string) => string
}

export const GraphFilterBar = memo(function GraphFilterBar({
  activeCategories,
  counts,
  onToggleCategory,
  getNodeColorDynamic,
}: GraphFilterBarProps) {
  const { isDark } = useCurrentTheme()

  const categories: GraphCategory[] = [
    'concept',
    'entity',
    'project',
    'skill',
    'daily',
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 select-none">
      {categories.map((cat) => {
        const config = CATEGORY_CONFIG[cat]
        const isActive = activeCategories.has(cat)
        const count = counts[cat] || 0
        const activeColor = getNodeColorDynamic ? getNodeColorDynamic(cat) : config.color

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onToggleCategory(cat)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 border',
              isActive
                ? 'bg-[var(--theme-card)] text-[var(--theme-text)] shadow-sm'
                : 'bg-transparent text-[var(--theme-muted)] opacity-50 hover:opacity-80',
            )}
            style={{
              borderColor: isActive
                ? 'var(--theme-border)'
                : 'transparent',
            }}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{
                backgroundColor: activeColor,
                boxShadow: isActive ? `0 0 6px ${activeColor}` : 'none',
              }}
            />
            <span>{config.label}</span>
            <span
              className="text-[10px] font-mono px-1 rounded"
              style={{
                backgroundColor: isActive
                  ? 'var(--theme-card2, rgba(255,255,255,0.05))'
                  : 'transparent',
                color: 'var(--theme-muted)',
              }}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
})
