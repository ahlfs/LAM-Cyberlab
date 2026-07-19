import { HugeiconsIcon } from '@hugeicons/react'
import {
  Archive01Icon,
  Delete02Icon,
  Folder01Icon,
  Link01Icon,
  StarIcon,
  Time01Icon,
} from '@hugeicons/core-free-icons'
import type { LinkuMode } from '../lib/mode'

const ITEMS: Array<{
  mode: LinkuMode
  label: string
  icon: Parameters<typeof HugeiconsIcon>[0]['icon']
}> = [
  { mode: { kind: 'folders' }, label: 'Folders', icon: Folder01Icon },
  { mode: { kind: 'view', view: 'all' }, label: 'All Links', icon: Link01Icon },
  { mode: { kind: 'view', view: 'recent' }, label: 'Recent', icon: Time01Icon },
  { mode: { kind: 'view', view: 'favorites' }, label: 'Favorites', icon: StarIcon },
  { mode: { kind: 'view', view: 'archive' }, label: 'Archive', icon: Archive01Icon },
  { mode: { kind: 'view', view: 'trash' }, label: 'Trash', icon: Delete02Icon },
]

function isActive(a: LinkuMode, b: LinkuMode): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'view' && b.kind === 'view') return a.view === b.view
  return true
}

export function LinksRail({
  mode,
  onSelect,
}: {
  mode: LinkuMode
  onSelect: (mode: LinkuMode) => void
}) {
  return (
    <nav
      aria-label="Links views"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {ITEMS.map((item) => {
        const active = isActive(mode, item.mode)
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.mode)}
            className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-safe:duration-150"
            style={{
              background: active
                ? 'var(--theme-accent-subtle)'
                : 'transparent',
              color: active ? 'var(--theme-accent)' : 'var(--theme-muted)',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--theme-card)'
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
            aria-current={active ? 'page' : undefined}
          >
            <HugeiconsIcon icon={item.icon} size={17} strokeWidth={1.75} className="shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
