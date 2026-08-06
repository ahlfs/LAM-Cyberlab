import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Search01Icon,
  Download01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons'
import { toast } from '@/components/ui/toast'
import type { LinkuFolder, LinkuLink } from '@/server/linku-db'
import type { LinkuMode } from './lib/mode'
import {
  recordLinkOpened,
  useDeleteFolder,
  useEmptyTrash,
  useFolders,
  useLinks,
  useImportLinks,
} from './lib/use-linku'
import { LinksRail } from './components/links-rail'
import { FolderGrid } from './components/folder-grid'
import { LinkGrid } from './components/link-grid'
import { FolderDialog } from './components/folder-dialog'
import { LinkDialog } from './components/link-dialog'
import { ConfirmDialog } from './components/confirm-dialog'

const VIEW_TITLES: Record<string, string> = {
  all: 'All Links',
  recent: 'Recent',
  favorites: 'Favorites',
  archive: 'Archive',
  trash: 'Trash',
}

export function LinksScreen() {
  const [mode, setMode] = useState<LinkuMode>({ kind: 'folders' })
  const [search, setSearch] = useState('')

  const [folderDialog, setFolderDialog] = useState<
    { open: false } | { open: true; folder: LinkuFolder | null }
  >({ open: false })
  const [linkDialog, setLinkDialog] = useState<
    | { open: false }
    | { open: true; link: LinkuLink | null; defaultFolderId: number | null }
  >({ open: false })
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<LinkuFolder | null>(null)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)

  const foldersQuery = useFolders()
  const deleteFolder = useDeleteFolder()
  const emptyTrash = useEmptyTrash()

  const activeFolder = useMemo(
    () =>
      mode.kind === 'folder'
        ? foldersQuery.data?.find((f) => f.id === mode.folderId)
        : undefined,
    [mode, foldersQuery.data],
  )

  const linksQuery = useLinks(
    mode.kind === 'folder'
      ? { folderId: mode.folderId, search: search || undefined }
      : mode.kind === 'view'
        ? { view: mode.view, search: search || undefined }
        : { view: 'all', search: search || undefined },
  )
  const showLinkGrid = mode.kind !== 'folders' || search.trim().length > 0

  const title =
    mode.kind === 'folder'
      ? (activeFolder?.name ?? 'Folder')
      : mode.kind === 'view'
        ? VIEW_TITLES[mode.view]
        : 'Folders'

  function handleCreateLink() {
    setLinkDialog({
      open: true,
      link: null,
      // Only prefill a folder when the user is actually browsing one;
      // elsewhere default to unsorted rather than guessing a folder.
      defaultFolderId: mode.kind === 'folder' ? mode.folderId : null,
    })
  }

  const importLinks = useImportLinks()

  const handleExport = () => {
    window.location.href = '/api/links/export'
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const payload = JSON.parse(ev.target?.result as string)
          importLinks.mutate(payload, {
            onSuccess: (res) => {
              toast(`Imported ${res.importedFolders} folders and ${res.importedLinks} links`, { type: 'success' })
            },
            onError: (err) => {
              toast(err instanceof Error ? err.message : 'Import failed', { type: 'error' })
            }
          })
        } catch (err) {
          toast('Invalid JSON file', { type: 'error' })
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="min-h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 pb-[calc(var(--tabbar-h,80px)+1.5rem)] sm:px-6 lg:px-8">
        <header
          className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'color-mix(in srgb, var(--theme-panel) 85%, transparent)',
          }}
        >
          <div className="relative flex-1 sm:max-w-sm">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--theme-muted)' }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search links, folders…"
              aria-label="Search links"
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors focus-visible:ring-2"
              style={
                {
                  background: 'var(--theme-input)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                  '--tw-ring-color': 'var(--theme-focus)',
                } as React.CSSProperties
              }
            />
          </div>
          <div className="flex flex-wrap shrink-0 gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={importLinks.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              title="Import links from JSON"
            >
              <HugeiconsIcon icon={Upload01Icon} size={16} className={importLinks.isPending ? "animate-bounce" : ""} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              title="Export links to JSON"
            >
              <HugeiconsIcon icon={Download01Icon} size={16} />
            </button>
            <div className="w-px h-6 bg-[var(--theme-border)] mx-1 self-center" />
            <button
              type="button"
              onClick={() => setFolderDialog({ open: true, folder: null })}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} />
              New folder
            </button>
            <button
              type="button"
              onClick={handleCreateLink}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} />
              New link
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row">
          <LinksRail
            mode={mode}
            onSelect={(next) => {
              setMode(next)
              setSearch('')
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {mode.kind === 'folder' ? (
                  <button
                    type="button"
                    onClick={() => setMode({ kind: 'folders' })}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md"
                    style={{ color: 'var(--theme-muted)' }}
                    aria-label="Back to folders"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                  </button>
                ) : null}
                <h1
                  className="truncate text-base font-semibold"
                  style={{ color: 'var(--theme-text)' }}
                >
                  {search.trim() ? `Search: "${search.trim()}"` : title}
                </h1>
              </div>
              {mode.kind === 'view' && mode.view === 'trash' && linksQuery.data?.length ? (
                <button
                  type="button"
                  onClick={() => setConfirmEmptyTrash(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium"
                  style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-danger)' }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                  Empty trash
                </button>
              ) : null}
            </div>

            {showLinkGrid ? (
              <LinkGrid
                links={linksQuery.data}
                isLoading={linksQuery.isLoading}
                isTrashView={mode.kind === 'view' && mode.view === 'trash'}
                isSearching={search.trim().length > 0}
                onEdit={(link) => {
                  recordLinkOpened(link.id)
                  setLinkDialog({ open: true, link, defaultFolderId: link.folderId })
                }}
                onCreateLink={handleCreateLink}
              />
            ) : (
              <FolderGrid
                folders={foldersQuery.data}
                isLoading={foldersQuery.isLoading}
                onOpenFolder={(id) => setMode({ kind: 'folder', folderId: id })}
                onEditFolder={(folder) => setFolderDialog({ open: true, folder })}
                onDeleteFolder={(folder) => setDeleteFolderTarget(folder)}
                onCreateFolder={() => setFolderDialog({ open: true, folder: null })}
              />
            )}
          </div>
        </div>
      </div>

      {folderDialog.open ? (
        <FolderDialog
          folder={folderDialog.folder}
          onClose={() => setFolderDialog({ open: false })}
        />
      ) : null}

      {linkDialog.open ? (
        <LinkDialog
          link={linkDialog.link}
          defaultFolderId={linkDialog.defaultFolderId}
          folders={foldersQuery.data ?? []}
          onClose={() => setLinkDialog({ open: false })}
        />
      ) : null}

      {deleteFolderTarget ? (
        <ConfirmDialog
          title={`Delete "${deleteFolderTarget.name}"?`}
          description={
            deleteFolderTarget.linkCount > 0
              ? `${deleteFolderTarget.linkCount} ${deleteFolderTarget.linkCount === 1 ? 'link' : 'links'} inside will move to Trash. You can restore them later.`
              : 'This folder is empty.'
          }
          confirmLabel="Delete folder"
          destructive
          onCancel={() => setDeleteFolderTarget(null)}
          onConfirm={() => {
            const target = deleteFolderTarget
            deleteFolder.mutate(target.id, {
              onSuccess: () => {
                toast(`Deleted "${target.name}"`)
                if (mode.kind === 'folder' && mode.folderId === target.id) {
                  setMode({ kind: 'folders' })
                }
              },
              onError: (err) => toast(err instanceof Error ? err.message : 'Failed to delete folder'),
            })
            setDeleteFolderTarget(null)
          }}
        />
      ) : null}

      {confirmEmptyTrash ? (
        <ConfirmDialog
          title="Empty trash?"
          description="Links in Trash will be permanently deleted. This can't be undone."
          confirmLabel="Empty trash"
          destructive
          onCancel={() => setConfirmEmptyTrash(false)}
          onConfirm={() => {
            emptyTrash.mutate(undefined, {
              onSuccess: (r) => toast(`Permanently deleted ${r.deleted} link${r.deleted === 1 ? '' : 's'}`),
              onError: (err) => toast(err instanceof Error ? err.message : 'Failed to empty trash'),
            })
            setConfirmEmptyTrash(false)
          }}
        />
      ) : null}
    </div>
  )
}
