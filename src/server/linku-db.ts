/**
 * Linku data layer — folders and links for the personal link manager
 * (PRD #3), backed by SQLite via better-sqlite3.
 *
 * DB file: `${getStateDir()}/linku/linku.db` (default
 * `~/.hermes/workspace/linku/linku.db`), the same durable-state
 * convention as knowledge-config.json / mcp-presets.json. Timestamps
 * are stored as UTC unix-ms; the client formats them in local time,
 * so no server-side timezone assumption is baked in.
 *
 * A link's folder is optional (`folder_id` is nullable) — links can
 * exist unsorted, and a deleted folder orphans (never deletes) its
 * links via ON DELETE SET NULL.
 */
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getStateDir } from './workspace-state-dir'

export type LinkuFolder = {
  id: number
  name: string
  color: string
  sortOrder: number
  linkCount: number
  createdAt: number
  updatedAt: number
}

export type LinkuLink = {
  id: number
  folderId: number | null
  folderName: string | null
  folderColor: string | null
  url: string
  title: string
  faviconUrl: string | null
  description: string | null
  isFavorite: boolean
  isArchived: boolean
  isTrashed: boolean
  trashedAt: number | null
  visitedCount: number
  openedCount: number
  lastVisitedAt: number | null
  lastOpenedAt: number | null
  createdAt: number
  updatedAt: number
}

export type LinkuView = 'all' | 'recent' | 'favorites' | 'archive' | 'trash'

export class LinkuNotFoundError extends Error {
  constructor(kind: string, id: number) {
    super(`${kind} ${id} not found`)
    this.name = 'LinkuNotFoundError'
  }
}

function getDbPath(): string {
  const dir = join(getStateDir(), 'linku')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'linku.db')
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    favicon_url TEXT,
    description TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_trashed INTEGER NOT NULL DEFAULT 0,
    trashed_at INTEGER,
    visited_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    last_visited_at INTEGER,
    last_opened_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_links_folder ON links(folder_id);
  CREATE INDEX idx_links_trashed ON links(is_trashed);
  CREATE INDEX idx_links_favorite ON links(is_favorite);
  CREATE INDEX idx_links_archived ON links(is_archived);
  `,
]

let db: DatabaseType | null = null

export function getDb(): DatabaseType {
  if (db) return db
  const instance = new Database(getDbPath())
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')

  const currentVersion = instance.pragma('user_version', { simple: true }) as number
  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    instance.exec(MIGRATIONS[v])
    instance.pragma(`user_version = ${v + 1}`)
  }

  db = instance
  return instance
}

/** Test/dev only: force a fresh connection (new DB path or in-memory). */
export function resetDbForTests(path?: string): DatabaseType {
  if (db) db.close()
  db = null
  if (path) {
    const instance = new Database(path)
    instance.pragma('journal_mode = WAL')
    instance.pragma('foreign_keys = ON')
    for (let v = 0; v < MIGRATIONS.length; v++) instance.exec(MIGRATIONS[v])
    instance.pragma(`user_version = ${MIGRATIONS.length}`)
    db = instance
    return instance
  }
  return getDb()
}

const now = () => Date.now()

// ── Folders ─────────────────────────────────────────────────────────────

export function listFolders(): LinkuFolder[] {
  const rows = getDb()
    .prepare(
      `SELECT f.id, f.name, f.color, f.sort_order, f.created_at, f.updated_at,
              (SELECT COUNT(*) FROM links l WHERE l.folder_id = f.id AND l.is_trashed = 0) AS link_count
       FROM folders f
       ORDER BY f.sort_order ASC, f.created_at ASC`,
    )
    .all() as Array<{
    id: number
    name: string
    color: string
    sort_order: number
    created_at: number
    updated_at: number
    link_count: number
  }>
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    sortOrder: r.sort_order,
    linkCount: r.link_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function getFolder(id: number): LinkuFolder | null {
  const folders = listFolders()
  return folders.find((f) => f.id === id) ?? null
}

export function createFolder(name: string, color: string): LinkuFolder {
  const t = now()
  const maxOrder = getDb()
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM folders`)
    .get() as { m: number }
  const info = getDb()
    .prepare(
      `INSERT INTO folders (name, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(name, color, maxOrder.m + 1, t, t)
  const folder = getFolder(Number(info.lastInsertRowid))
  if (!folder) throw new Error('folder insert failed')
  return folder
}

export function updateFolder(
  id: number,
  patch: { name?: string; color?: string },
): LinkuFolder {
  const existing = getFolder(id)
  if (!existing) throw new LinkuNotFoundError('folder', id)
  getDb()
    .prepare(`UPDATE folders SET name = ?, color = ?, updated_at = ? WHERE id = ?`)
    .run(patch.name ?? existing.name, patch.color ?? existing.color, now(), id)
  const updated = getFolder(id)
  if (!updated) throw new Error('folder update failed')
  return updated
}

/** Soft-deletes every link in the folder (moves to trash), then removes the folder itself. */
export function deleteFolder(id: number): void {
  const existing = getFolder(id)
  if (!existing) throw new LinkuNotFoundError('folder', id)
  const t = now()
  const runner = getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE links SET is_trashed = 1, trashed_at = ?, updated_at = ? WHERE folder_id = ? AND is_trashed = 0`,
      )
      .run(t, t, id)
    getDb().prepare(`DELETE FROM folders WHERE id = ?`).run(id)
  })
  runner()
}

// ── Links ───────────────────────────────────────────────────────────────

function hydrateLink(row: Record<string, unknown>): LinkuLink {
  return {
    id: row.id as number,
    folderId: (row.folder_id as number | null) ?? null,
    folderName: (row.folder_name as string | null) ?? null,
    folderColor: (row.folder_color as string | null) ?? null,
    url: row.url as string,
    title: row.title as string,
    faviconUrl: (row.favicon_url as string) ?? null,
    description: (row.description as string) ?? null,
    isFavorite: Boolean(row.is_favorite),
    isArchived: Boolean(row.is_archived),
    isTrashed: Boolean(row.is_trashed),
    trashedAt: (row.trashed_at as number) ?? null,
    visitedCount: row.visited_count as number,
    openedCount: row.opened_count as number,
    lastVisitedAt: (row.last_visited_at as number) ?? null,
    lastOpenedAt: (row.last_opened_at as number) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }
}

const LINK_SELECT = `
  SELECT l.*, f.name AS folder_name, f.color AS folder_color
  FROM links l LEFT JOIN folders f ON f.id = l.folder_id
`

export function listLinks(opts: {
  folderId?: number
  view?: LinkuView
  search?: string
  limit?: number
  offset?: number
} = {}): LinkuLink[] {
  const view = opts.view ?? 'all'
  const clauses: string[] = []
  const params: Array<string | number> = []

  if (opts.folderId != null) {
    clauses.push('l.folder_id = ?')
    params.push(opts.folderId)
  }

  if (view === 'trash') {
    clauses.push('l.is_trashed = 1')
  } else {
    clauses.push('l.is_trashed = 0')
    if (view === 'favorites') clauses.push('l.is_favorite = 1')
    if (view === 'archive') clauses.push('l.is_archived = 1')
    if (view === 'all' || view === 'recent') clauses.push('l.is_archived = 0')
  }

  if (opts.search?.trim()) {
    const needle = `%${opts.search.trim()}%`
    clauses.push('(l.title LIKE ? OR l.url LIKE ?)')
    params.push(needle, needle)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy =
    view === 'recent'
      ? 'ORDER BY l.created_at DESC'
      : view === 'trash'
        ? 'ORDER BY l.trashed_at DESC'
        : 'ORDER BY l.created_at DESC'
  const limit = opts.limit ?? (view === 'recent' ? 20 : 500)
  const offset = opts.offset ?? 0

  const rows = getDb()
    .prepare(`${LINK_SELECT} ${where} ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Array<Record<string, unknown>>
  return rows.map(hydrateLink)
}

export function getLink(id: number): LinkuLink | null {
  const row = getDb().prepare(`${LINK_SELECT} WHERE l.id = ?`).get(id) as
    | Record<string, unknown>
    | undefined
  return row ? hydrateLink(row) : null
}

export function createLink(input: {
  folderId?: number | null
  url: string
  title: string
  faviconUrl?: string | null
  description?: string | null
}): LinkuLink {
  if (input.folderId != null && !getFolder(input.folderId)) {
    throw new LinkuNotFoundError('folder', input.folderId)
  }
  const t = now()
  const info = getDb()
    .prepare(
      `INSERT INTO links
         (folder_id, url, title, favicon_url, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.folderId ?? null,
      input.url,
      input.title,
      input.faviconUrl ?? null,
      input.description ?? null,
      t,
      t,
    )
  const link = getLink(Number(info.lastInsertRowid))
  if (!link) throw new Error('link insert failed')
  return link
}

export function updateLink(
  id: number,
  patch: {
    /** `undefined` = leave unchanged; `null` = clear (unsort); a number = move to that folder. */
    folderId?: number | null
    url?: string
    title?: string
    faviconUrl?: string | null
    description?: string | null
  },
): LinkuLink {
  const existing = getLink(id)
  if (!existing) throw new LinkuNotFoundError('link', id)
  if (patch.folderId != null && !getFolder(patch.folderId)) {
    throw new LinkuNotFoundError('folder', patch.folderId)
  }
  getDb()
    .prepare(
      `UPDATE links SET folder_id = ?, url = ?, title = ?, favicon_url = ?, description = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.folderId !== undefined ? patch.folderId : existing.folderId,
      patch.url ?? existing.url,
      patch.title ?? existing.title,
      patch.faviconUrl !== undefined ? patch.faviconUrl : existing.faviconUrl,
      patch.description !== undefined ? patch.description : existing.description,
      now(),
      id,
    )
  const updated = getLink(id)
  if (!updated) throw new Error('link update failed')
  return updated
}

function touchAndGet(id: number, sql: string, params: Array<string | number>): LinkuLink {
  const existing = getLink(id)
  if (!existing) throw new LinkuNotFoundError('link', id)
  getDb().prepare(sql).run(...params, id)
  const updated = getLink(id)
  if (!updated) throw new Error('link update failed')
  return updated
}

export function toggleFavorite(id: number): LinkuLink {
  const existing = getLink(id)
  if (!existing) throw new LinkuNotFoundError('link', id)
  return touchAndGet(
    id,
    `UPDATE links SET is_favorite = ?, updated_at = ? WHERE id = ?`,
    [existing.isFavorite ? 0 : 1, now()],
  )
}

export function toggleArchive(id: number): LinkuLink {
  const existing = getLink(id)
  if (!existing) throw new LinkuNotFoundError('link', id)
  return touchAndGet(
    id,
    `UPDATE links SET is_archived = ?, updated_at = ? WHERE id = ?`,
    [existing.isArchived ? 0 : 1, now()],
  )
}

export function softDeleteLink(id: number): LinkuLink {
  const t = now()
  return touchAndGet(
    id,
    `UPDATE links SET is_trashed = 1, trashed_at = ?, updated_at = ? WHERE id = ?`,
    [t, t],
  )
}

export function restoreLink(id: number): LinkuLink {
  return touchAndGet(
    id,
    `UPDATE links SET is_trashed = 0, trashed_at = NULL, updated_at = ? WHERE id = ?`,
    [now()],
  )
}

export function permanentlyDeleteLink(id: number): void {
  const existing = getLink(id)
  if (!existing) throw new LinkuNotFoundError('link', id)
  getDb().prepare(`DELETE FROM links WHERE id = ? AND is_trashed = 1`).run(id)
}

export function emptyTrash(): number {
  const info = getDb().prepare(`DELETE FROM links WHERE is_trashed = 1`).run()
  return info.changes
}

/** "Dikunjungi" — the redirect-through counter (Open website button). */
export function recordVisit(id: number): LinkuLink {
  const t = now()
  return touchAndGet(
    id,
    `UPDATE links SET visited_count = visited_count + 1, last_visited_at = ? WHERE id = ?`,
    [t],
  )
}

/** "Dibuka" — the in-app detail-view counter. */
export function recordOpen(id: number): LinkuLink {
  const t = now()
  return touchAndGet(
    id,
    `UPDATE links SET opened_count = opened_count + 1, last_opened_at = ? WHERE id = ?`,
    [t],
  )
}

/** Import folders and links from a JSON payload, skipping duplicate URLs and mapping folder IDs. */
export function importData(data: { folders: LinkuFolder[]; links: LinkuLink[] }): { importedFolders: number; importedLinks: number } {
  let importedFolders = 0
  let importedLinks = 0

  const runner = getDb().transaction(() => {
    // 1. Map old folder ID to new folder ID
    const folderIdMap = new Map<number, number>()
    const existingFolders = listFolders()
    
    for (const folder of data.folders) {
      // Find by name to avoid duplicates
      const existing = existingFolders.find(f => f.name === folder.name)
      if (existing) {
        folderIdMap.set(folder.id, existing.id)
      } else {
        const t = now()
        const maxOrder = getDb()
          .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM folders`)
          .get() as { m: number }
        const info = getDb()
          .prepare(
            `INSERT INTO folders (name, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
          )
          .run(folder.name, folder.color, maxOrder.m + 1, folder.createdAt || t, folder.updatedAt || t)
        folderIdMap.set(folder.id, Number(info.lastInsertRowid))
        importedFolders++
      }
    }

    // 2. Insert links, skipping existing URLs
    const existingUrls = new Set(
      (getDb().prepare(`SELECT url FROM links`).all() as { url: string }[]).map(r => r.url)
    )

    for (const link of data.links) {
      if (existingUrls.has(link.url)) continue // skip duplicate URL
      // Skip trashed links
      if (link.isTrashed) continue

      const newFolderId = link.folderId ? folderIdMap.get(link.folderId) ?? null : null
      const t = now()

      getDb()
        .prepare(
          `INSERT INTO links (folder_id, url, title, favicon_url, description, is_favorite, is_archived, is_trashed, visited_count, opened_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
        )
        .run(
          newFolderId,
          link.url,
          link.title,
          link.faviconUrl ?? null,
          link.description ?? null,
          link.isFavorite ? 1 : 0,
          link.isArchived ? 1 : 0,
          link.visitedCount || 0,
          link.openedCount || 0,
          link.createdAt || t,
          link.updatedAt || t
        )
      existingUrls.add(link.url)
      importedLinks++
    }
  })
  
  runner()
  return { importedFolders, importedLinks }
}
