import { HugeiconsIcon } from '@hugeicons/react'
import { Folder01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons'
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/ui/menu'
import type { LinkuFolder } from '@/server/linku-db'

function FolderSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[86px] rounded-xl rounded-tl-sm border motion-safe:animate-pulse"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    />
  )
}

function FolderTabCard({
  folder,
  onOpen,
  onEdit,
  onDelete,
}: {
  folder: LinkuFolder
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group/folder relative">
      <div
        aria-hidden
        className="absolute -top-2 left-3.5 h-3 w-11 rounded-t-md"
        style={{ background: folder.color }}
      />
      <button
        type="button"
        onClick={onOpen}
        className="relative flex w-full flex-col gap-2.5 rounded-xl rounded-tl-sm border p-3.5 text-left transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5"
        style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-2 pr-6">
          <HugeiconsIcon
            icon={Folder01Icon}
            size={18}
            strokeWidth={1.75}
            style={{ color: folder.color }}
            className="shrink-0"
          />
          <span
            className="truncate text-sm font-medium"
            style={{ color: 'var(--theme-text)' }}
          >
            {folder.name}
          </span>
        </div>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--theme-muted)' }}>
          {folder.linkCount} {folder.linkCount === 1 ? 'link' : 'links'}
        </span>
      </button>

      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity motion-safe:duration-150 group-hover/folder:opacity-100 group-focus-within/folder:opacity-100 has-[[data-popup-open]]:opacity-100">
        <MenuRoot>
          <MenuTrigger
            className="inline-flex size-6 items-center justify-center rounded-md"
            style={{ color: 'var(--theme-muted)' }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${folder.name} options`}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
          </MenuTrigger>
          <MenuContent>
            <MenuItem onClick={onEdit}>Edit folder</MenuItem>
            <MenuItem onClick={onDelete} style={{ color: 'var(--theme-danger)' }}>
              Delete folder
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </div>
    </div>
  )
}

export function FolderGrid({
  folders,
  isLoading,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder,
  onCreateFolder,
}: {
  folders: LinkuFolder[] | undefined
  isLoading: boolean
  onOpenFolder: (id: number) => void
  onEditFolder: (folder: LinkuFolder) => void
  onDeleteFolder: (folder: LinkuFolder) => void
  onCreateFolder: () => void
}) {
  if (isLoading) {
    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
      >
        {[0, 1, 2, 3].map((i) => (
          <FolderSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!folders || folders.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <HugeiconsIcon icon={Folder01Icon} size={28} style={{ color: 'var(--theme-muted)' }} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
            No folders yet
          </p>
          <p className="text-[13px]" style={{ color: 'var(--theme-muted)' }}>
            Create a folder to start saving links.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateFolder}
          className="mt-1 rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
        >
          New folder
        </button>
      </div>
    )
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
    >
      {folders.map((folder) => (
        <FolderTabCard
          key={folder.id}
          folder={folder}
          onOpen={() => onOpenFolder(folder.id)}
          onEdit={() => onEditFolder(folder)}
          onDelete={() => onDeleteFolder(folder)}
        />
      ))}
    </div>
  )
}
