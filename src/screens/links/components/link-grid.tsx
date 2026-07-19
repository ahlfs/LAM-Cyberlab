import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete02Icon, Link01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import type { LinkuLink } from '@/server/linku-db'
import { LinkCard } from './link-card'

function LinkSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[108px] rounded-xl border motion-safe:animate-pulse"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    />
  )
}

export function LinkGrid({
  links,
  isLoading,
  isTrashView,
  isSearching,
  onEdit,
  onCreateLink,
}: {
  links: LinkuLink[] | undefined
  isLoading: boolean
  isTrashView: boolean
  isSearching: boolean
  onEdit: (link: LinkuLink) => void
  onCreateLink: () => void
}) {
  if (isLoading) {
    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {[0, 1, 2].map((i) => (
          <LinkSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!links || links.length === 0) {
    if (isSearching) {
      return (
        <EmptyState
          icon={Search01Icon}
          title="No matches"
          description="Try a different search term."
        />
      )
    }
    if (isTrashView) {
      return (
        <EmptyState
          icon={Delete02Icon}
          title="Trash is empty"
          description="Deleted links show up here before they're gone for good."
        />
      )
    }
    return (
      <EmptyState
        icon={Link01Icon}
        title="No links yet"
        description="Save your first link to this view."
        action={{ label: 'New link', onClick: onCreateLink }}
      />
    )
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {links.map((link) => (
        <LinkCard key={link.id} link={link} isTrashView={isTrashView} onEdit={() => onEdit(link)} />
      ))}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]['icon']
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <HugeiconsIcon icon={icon} size={28} style={{ color: 'var(--theme-muted)' }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
          {title}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--theme-muted)' }}>
          {description}
        </p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} />
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
