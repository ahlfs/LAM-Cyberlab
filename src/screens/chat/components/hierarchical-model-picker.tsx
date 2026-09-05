import React, { useMemo, useState, useEffect } from 'react'
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  Search01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  buildModelHierarchy,
  filterModelHierarchy,
  getAncestorGroupPaths,
  isGroupNode,
  type HierarchicalModelGroup,
  type HierarchicalModelItem,
  type HierarchicalModelNode,
} from './model-hierarchy'

export interface HierarchicalModelPickerProps {
  models: HierarchicalModelItem[]
  activeModel?: string
  isPinned: (id: string) => boolean
  togglePin: (id: string) => void
  onSelectModel: (id: string, provider?: string) => void
  isCurrentModel: (activeModel: string, entryId: string, entryProvider: string) => boolean
  isMobile?: boolean
  searchPlaceholder?: string
}

export const HierarchicalModelPicker: React.FC<HierarchicalModelPickerProps> = ({
  models,
  activeModel = '',
  isPinned,
  togglePin,
  onSelectModel,
  isCurrentModel,
  isMobile = false,
  searchPlaceholder = 'Search models or prefixes...',
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Initial auto-expansion for active model's ancestors
    const initial = new Set<string>()
    if (activeModel) {
      const ancestors = getAncestorGroupPaths(activeModel)
      for (const p of ancestors) {
        initial.add(p)
      }
    }
    return initial
  })

  // Auto-expand ancestors when activeModel changes
  useEffect(() => {
    if (!activeModel) return
    const ancestors = getAncestorGroupPaths(activeModel)
    if (ancestors.length > 0) {
      setExpandedGroups((prev) => {
        const next = new Set(prev)
        for (const p of ancestors) {
          next.add(p)
        }
        return next
      })
    }
  }, [activeModel])

  const toggleGroup = (fullPath: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(fullPath)) {
        next.delete(fullPath)
      } else {
        next.add(fullPath)
      }
      return next
    })
  }

  // Split pinned models vs all unpinned
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const pinned: HierarchicalModelItem[] = []
    const unpinned: HierarchicalModelItem[] = []
    for (const m of models) {
      if (isPinned(m.id)) {
        pinned.push(m)
      } else {
        unpinned.push(m)
      }
    }
    return { pinnedItems: pinned, unpinnedItems: unpinned }
  }, [models, isPinned])

  // Build hierarchy tree for unpinned models
  const fullHierarchyTree = useMemo(() => {
    return buildModelHierarchy(unpinnedItems)
  }, [unpinnedItems])

  // Filter tree and pinned items if searchQuery is present
  const { filteredPinned, filteredTree } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return {
        filteredPinned: pinnedItems,
        filteredTree: fullHierarchyTree,
      }
    }
    const fp = pinnedItems.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.provider && m.provider.toLowerCase().includes(q)),
    )
    const ft = filterModelHierarchy(fullHierarchyTree, q)
    return { filteredPinned: fp, filteredTree: ft }
  }, [searchQuery, pinnedItems, fullHierarchyTree])

  // Render individual Model Item
  const renderItem = (entry: HierarchicalModelItem, depth = 0) => {
    const isActive = isCurrentModel(activeModel, entry.id, entry.provider || '')
    const pinned = isPinned(entry.id)

    return (
      <div
        key={entry.id}
        className="group relative flex items-center select-none"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelectModel(entry.id, entry.provider || undefined)
          }}
          className={`flex flex-1 items-center gap-2.5 pl-3 pr-8 ${
            isMobile ? 'py-3 text-sm' : 'py-2 text-xs sm:text-sm'
          } rounded-lg text-left transition-all duration-150 cursor-pointer ${
            isActive
              ? 'bg-accent-50 text-accent-700 font-semibold dark:bg-accent-900/30 dark:text-accent-300 border-l-2 border-accent-500 shadow-sm'
              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-300 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
          title={entry.id}
        >
          <span className="flex-1 truncate">{entry.name || entry.id}</span>
          {entry.isLocal && (
            <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-normal shrink-0">
              local
            </span>
          )}
        </button>

        {/* Pin button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            togglePin(entry.id)
          }}
          className={`absolute right-2 rounded p-1.5 transition-opacity ${
            pinned
              ? 'text-accent-500 opacity-90 hover:opacity-100'
              : 'text-neutral-400 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-accent-500'
          }`}
          aria-label={pinned ? `Unpin ${entry.name}` : `Pin ${entry.name}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={pinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
          </svg>
        </button>
      </div>
    )
  }

  // Render Group Node (recursive accordion)
  const renderGroup = (group: HierarchicalModelGroup, depth = 0) => {
    // When searching, auto-expand matching groups
    const isSearching = searchQuery.trim().length > 0
    const isExpanded = isSearching || expandedGroups.has(group.fullPath)

    return (
      <div key={`group-${group.fullPath}`} className="space-y-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleGroup(group.fullPath)
          }}
          style={{ paddingLeft: `${depth * 12 + 10}px` }}
          className={`flex w-full items-center gap-2 py-1.5 pr-3 text-left font-medium text-xs uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
            isExpanded
              ? 'text-neutral-800 dark:text-neutral-200 bg-neutral-100/50 dark:bg-neutral-800/40'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/40 dark:hover:bg-neutral-800/20'
          }`}
        >
          <HugeiconsIcon
            icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
            size={13}
            className="shrink-0 text-neutral-400"
          />
          <HugeiconsIcon
            icon={Folder01Icon}
            size={14}
            className="shrink-0 text-primary-500/80 dark:text-primary-400/80"
          />
          <span className="flex-1 truncate font-semibold lowercase font-mono">{group.name}</span>
          <span className="text-[10px] text-neutral-400 font-normal px-1.5 py-0.2 rounded bg-neutral-200/50 dark:bg-neutral-800">
            {group.totalModels}
          </span>
        </button>

        {isExpanded && (
          <div className="space-y-0.5 border-l border-neutral-200/60 dark:border-neutral-800/80 ml-3.5 pl-0.5 my-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {group.children.map((childNode) =>
              isGroupNode(childNode)
                ? renderGroup(childNode, depth + 1)
                : renderItem(childNode, depth + 1),
            )}
          </div>
        )}
      </div>
    )
  }

  const renderNode = (node: HierarchicalModelNode, depth = 0) => {
    if (isGroupNode(node)) {
      return renderGroup(node, depth)
    }
    return renderItem(node, depth)
  }

  return (
    <div
      className="flex flex-col w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Search Input Box */}
      <div className="px-3 pb-2 pt-1">
        <div className="relative flex items-center">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="absolute left-2.5 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-neutral-800/60 dark:border-neutral-700/80 pl-8 pr-7 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="Clear search"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Models List / Tree */}
      <div className="space-y-1 overflow-y-auto px-1">
        {/* Pinned Section */}
        {filteredPinned.length > 0 && (
          <div className="mb-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent-500"
              >
                <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
              </svg>
              <span>Pinned</span>
            </div>
            {filteredPinned.map((item) => renderItem(item, 0))}
          </div>
        )}

        {/* Hierarchy Section */}
        {filteredTree.length > 0 ? (
          <div className="space-y-0.5">
            {filteredTree.map((node) => renderNode(node, 0))}
          </div>
        ) : (
          filteredPinned.length === 0 && (
            <div className="p-4 text-center text-xs text-neutral-500">
              No matching models found.
            </div>
          )
        )}
      </div>
    </div>
  )
}
