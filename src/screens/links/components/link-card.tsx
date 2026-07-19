import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Archive01Icon,
  Delete02Icon,
  GlobalIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  StarIcon,
  Undo02Icon,
} from '@hugeicons/core-free-icons'
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/ui/menu'
import { toast } from '@/components/ui/toast'
import type { LinkuLink } from '@/server/linku-db'
import {
  usePermanentlyDeleteLink,
  useRestoreLink,
  useToggleArchive,
  useToggleFavorite,
  useTrashLink,
} from '../lib/use-linku'

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatCount(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? '' : 's'}`
}

/**
 * The whole card is the "open" affordance (a real <a> to the go-redirect
 * endpoint, so middle-click / copy-link / target=_blank all work
 * natively and "Dikunjungi" gets recorded). Every other action —
 * edit, favorite, archive, trash/restore — lives behind the single
 * "..." menu, which sits as a sibling on top of the anchor rather
 * than nested inside it (matches FolderTabCard's layering, and
 * avoids interactive-inside-interactive markup).
 */
export function LinkCard({
  link,
  isTrashView,
  onEdit,
}: {
  link: LinkuLink
  isTrashView: boolean
  onEdit: () => void
}) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const toggleFavorite = useToggleFavorite()
  const toggleArchive = useToggleArchive()
  const trashLink = useTrashLink()
  const restoreLink = useRestoreLink()
  const permanentlyDelete = usePermanentlyDeleteLink()

  return (
    <div className="group/link relative">
      <a
        href={`/api/links/go/${link.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5"
        style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-start gap-2.5 pr-6">
          {link.faviconUrl && !faviconFailed ? (
            <img
              src={link.faviconUrl}
              alt=""
              width={20}
              height={20}
              className="mt-0.5 size-5 shrink-0 rounded-sm"
              onError={() => setFaviconFailed(true)}
            />
          ) : (
            <span
              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm"
              style={{ background: 'var(--theme-card2)', color: 'var(--theme-muted)' }}
            >
              <HugeiconsIcon icon={GlobalIcon} size={12} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {link.title}
            </p>
            <p className="truncate font-mono text-[11px]" style={{ color: 'var(--theme-muted)' }}>
              {hostnameOf(link.url)}
            </p>
          </div>
          {link.isFavorite ? (
            <HugeiconsIcon
              icon={StarIcon}
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: 'var(--theme-warning)' }}
              aria-label="Favorited"
            />
          ) : null}
        </div>

        <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--theme-muted)' }}>
          {formatCount(link.visitedCount, 'visit')} · {formatCount(link.openedCount, 'open')}
        </span>
      </a>

      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity motion-safe:duration-150 group-hover/link:opacity-100 group-focus-within/link:opacity-100 has-[[data-popup-open]]:opacity-100">
        <MenuRoot>
          <MenuTrigger
            className="inline-flex size-6 items-center justify-center rounded-md"
            style={{ color: 'var(--theme-muted)', background: 'var(--theme-card)' }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${link.title} options`}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
          </MenuTrigger>
          <MenuContent>
            {isTrashView ? (
              <>
                <MenuItem
                  onClick={() =>
                    restoreLink.mutate(link.id, {
                      onSuccess: () => toast(`Restored "${link.title}"`),
                      onError: (err) =>
                        toast(err instanceof Error ? err.message : 'Failed to restore'),
                    })
                  }
                >
                  <HugeiconsIcon icon={Undo02Icon} size={14} />
                  Restore
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    permanentlyDelete.mutate(link.id, {
                      onSuccess: () => toast(`Permanently deleted "${link.title}"`),
                      onError: (err) =>
                        toast(err instanceof Error ? err.message : 'Failed to delete'),
                    })
                  }
                  style={{ color: 'var(--theme-danger)' }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                  Delete permanently
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem onClick={onEdit}>
                  <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    toggleFavorite.mutate(link.id, {
                      onError: (err) =>
                        toast(err instanceof Error ? err.message : 'Failed to update'),
                    })
                  }
                >
                  <HugeiconsIcon icon={StarIcon} size={14} />
                  {link.isFavorite ? 'Unfavorite' : 'Favorite'}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    toggleArchive.mutate(link.id, {
                      onSuccess: (updated) =>
                        toast(updated.isArchived ? 'Archived' : 'Unarchived'),
                      onError: (err) =>
                        toast(err instanceof Error ? err.message : 'Failed to update'),
                    })
                  }
                >
                  <HugeiconsIcon icon={Archive01Icon} size={14} />
                  {link.isArchived ? 'Unarchive' : 'Archive'}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    trashLink.mutate(link.id, {
                      onSuccess: () => toast(`Moved "${link.title}" to Trash`),
                      onError: (err) =>
                        toast(err instanceof Error ? err.message : 'Failed to trash'),
                    })
                  }
                  style={{ color: 'var(--theme-danger)' }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                  Move to Trash
                </MenuItem>
              </>
            )}
          </MenuContent>
        </MenuRoot>
      </div>
    </div>
  )
}
