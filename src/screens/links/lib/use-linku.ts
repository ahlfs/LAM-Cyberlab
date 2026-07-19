/**
 * React Query hooks for the Linku screen. Every mutation invalidates
 * both the folders and links query families since folder link-counts
 * and link folder-refs can change together (e.g. moving a link).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LinkuFolder, LinkuLink, LinkuView } from '@/server/linku-db'

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`,
    )
  }
  return body as T
}

const FOLDERS_KEY = ['linku', 'folders'] as const
const linksKey = (params: { view?: LinkuView; folderId?: number; search?: string }) =>
  ['linku', 'links', params.view ?? 'all', params.folderId ?? null, params.search ?? ''] as const

export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: () => apiJson<{ folders: LinkuFolder[] }>('/api/links/folders').then((r) => r.folders),
  })
}

export function useLinks(params: { view?: LinkuView; folderId?: number; search?: string }) {
  const qs = new URLSearchParams()
  if (params.view) qs.set('view', params.view)
  if (params.folderId != null) qs.set('folderId', String(params.folderId))
  if (params.search) qs.set('search', params.search)
  return useQuery({
    queryKey: linksKey(params),
    queryFn: () =>
      apiJson<{ links: LinkuLink[] }>(`/api/links?${qs.toString()}`).then((r) => r.links),
  })
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['linku'] })
  }
}

export function useCreateFolder() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      apiJson<{ folder: LinkuFolder }>('/api/links/folders', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((r) => r.folder),
    onSuccess: invalidate,
  })
}

export function useUpdateFolder() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: number; name?: string; color?: string }) =>
      apiJson<{ folder: LinkuFolder }>(`/api/links/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }).then((r) => r.folder),
    onSuccess: invalidate,
  })
}

export function useDeleteFolder() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => apiJson(`/api/links/folders/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useCreateLink() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (input: {
      folderId?: number | null
      url: string
      title: string
      faviconUrl?: string | null
      description?: string | null
    }) =>
      apiJson<{ link: LinkuLink }>('/api/links', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((r) => r.link),
    onSuccess: invalidate,
  })
}

export function useUpdateLink() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: number
      folderId?: number | null
      url?: string
      title?: string
      faviconUrl?: string | null
      description?: string | null
    }) =>
      apiJson<{ link: LinkuLink }>(`/api/links/item/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }).then((r) => r.link),
    onSuccess: invalidate,
  })
}

export function useToggleFavorite() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) =>
      apiJson<{ link: LinkuLink }>(`/api/links/item/${id}/favorite`, { method: 'POST' }).then(
        (r) => r.link,
      ),
    onSuccess: invalidate,
  })
}

export function useToggleArchive() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) =>
      apiJson<{ link: LinkuLink }>(`/api/links/item/${id}/archive`, { method: 'POST' }).then(
        (r) => r.link,
      ),
    onSuccess: invalidate,
  })
}

export function useTrashLink() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => apiJson(`/api/links/item/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useRestoreLink() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) =>
      apiJson<{ link: LinkuLink }>(`/api/links/item/${id}/restore`, { method: 'POST' }).then(
        (r) => r.link,
      ),
    onSuccess: invalidate,
  })
}

export function usePermanentlyDeleteLink() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => apiJson(`/api/links/item/${id}?permanent=true`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useEmptyTrash() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: () => apiJson<{ deleted: number }>('/api/links/trash-empty', { method: 'POST' }),
    onSuccess: invalidate,
  })
}

/** Fire-and-forget: records the "Dibuka" (opened-in-app) counter when a link's detail/edit view opens. */
export function recordLinkOpened(id: number): void {
  void fetch(`/api/links/item/${id}`).catch(() => {})
}

export function useScrapeUrl() {
  return useMutation({
    mutationFn: (url: string) =>
      apiJson<{ title: string; faviconUrl: string | null }>('/api/links/scrape', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
  })
}
