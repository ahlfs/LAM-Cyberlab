import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { RefreshIcon } from '@hugeicons/core-free-icons'
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import type { LinkuFolder, LinkuLink } from '@/server/linku-db'
import { useCreateLink, useScrapeUrl, useUpdateLink } from '../lib/use-linku'

function isLikelyUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function LinkDialog({
  link,
  defaultFolderId,
  folders,
  onClose,
}: {
  link: LinkuLink | null
  defaultFolderId: number | null
  folders: LinkuFolder[]
  onClose: () => void
}) {
  const isEdit = link != null
  const [url, setUrl] = useState(link?.url ?? '')
  const [title, setTitle] = useState(link?.title ?? '')
  const [faviconUrl, setFaviconUrl] = useState<string | null>(link?.faviconUrl ?? null)
  const [folderId, setFolderId] = useState<number | null>(link?.folderId ?? defaultFolderId)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  const scrape = useScrapeUrl()
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()
  const pending = createLink.isPending || updateLink.isPending

  function runScrape(targetUrl: string) {
    if (!isLikelyUrl(targetUrl)) return
    setScrapeError(null)
    scrape.mutate(targetUrl, {
      onSuccess: (result) => {
        if (!title.trim()) setTitle(result.title)
        if (result.faviconUrl) setFaviconUrl(result.faviconUrl)
      },
      onError: (err) => {
        setScrapeError(err instanceof Error ? err.message : 'Could not fetch title/favicon')
      },
    })
  }

  function handleUrlBlur() {
    if (isEdit) return // don't auto-reclobber an existing, already-titled link
    if (!title.trim() && isLikelyUrl(url)) runScrape(url)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!isLikelyUrl(trimmedUrl)) {
      toast('Enter a valid http(s) URL')
      return
    }
    const effectiveTitle = title.trim() || trimmedUrl
    const onSuccess = () => {
      toast(isEdit ? `Updated "${effectiveTitle}"` : `Saved "${effectiveTitle}"`)
      onClose()
    }
    const onError = (err: unknown) =>
      toast(err instanceof Error ? err.message : 'Something went wrong')

    if (isEdit) {
      updateLink.mutate(
        { id: link.id, folderId, url: trimmedUrl, title: effectiveTitle, faviconUrl },
        { onSuccess, onError },
      )
    } else {
      createLink.mutate(
        { folderId, url: trimmedUrl, title: effectiveTitle, faviconUrl },
        { onSuccess, onError },
      )
    }
  }

  return (
    <DialogRoot
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="w-[min(460px,92vw)]">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-5">
          <DialogTitle>{isEdit ? 'Edit link' : 'New link'}</DialogTitle>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text)' }}>
              URL
            </span>
            <div className="flex items-center gap-2">
              <input
                autoFocus={!isEdit}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com/article"
                required
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                style={
                  {
                    background: 'var(--theme-input)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                    '--tw-ring-color': 'var(--theme-focus)',
                  } as React.CSSProperties
                }
              />
              <button
                type="button"
                onClick={() => runScrape(url)}
                disabled={!isLikelyUrl(url) || scrape.isPending}
                title="Fetch title and favicon"
                aria-label="Fetch title and favicon"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border disabled:pointer-events-none disabled:opacity-40"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  size={15}
                  className={scrape.isPending ? 'motion-safe:animate-spin' : undefined}
                />
              </button>
            </div>
            {scrapeError ? (
              <span className="text-[12px]" style={{ color: 'var(--theme-warning)' }}>
                {scrapeError} — you can still fill in the title yourself.
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text)' }}>
              Title
            </span>
            <div className="flex items-center gap-2">
              {faviconUrl ? (
                <img src={faviconUrl} alt="" width={18} height={18} className="size-[18px] shrink-0 rounded-sm" />
              ) : null}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={scrape.isPending ? 'Fetching…' : 'Link title'}
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
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
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text)' }}>
              Folder
            </span>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              style={
                {
                  background: 'var(--theme-input)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                  '--tw-ring-color': 'var(--theme-focus)',
                } as React.CSSProperties
              }
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose onClick={onClose}>Cancel</DialogClose>
            <button
              type="submit"
              disabled={pending || !isLikelyUrl(url)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
            >
              {pending ? 'Saving…' : isEdit ? 'Save' : 'Add link'}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
