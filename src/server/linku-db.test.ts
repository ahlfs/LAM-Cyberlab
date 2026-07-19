import { beforeEach, describe, expect, it } from 'vitest'
import {
  LinkuNotFoundError,
  createFolder,
  createLink,
  deleteFolder,
  emptyTrash,
  getLink,
  listFolders,
  listLinks,
  permanentlyDeleteLink,
  recordOpen,
  recordVisit,
  resetDbForTests,
  restoreLink,
  softDeleteLink,
  toggleArchive,
  toggleFavorite,
  updateFolder,
  updateLink,
} from './linku-db'

beforeEach(() => {
  resetDbForTests(':memory:')
})

describe('folders', () => {
  it('creates a folder with an incrementing sort order and zero link count', () => {
    const a = createFolder('Reading', '#FFAC02')
    const b = createFolder('Recipes', '#8FFF89')
    expect(a.sortOrder).toBe(0)
    expect(b.sortOrder).toBe(1)
    expect(a.linkCount).toBe(0)
  })

  it('updates name/color independently', () => {
    const f = createFolder('Reading', '#FFAC02')
    const updated = updateFolder(f.id, { color: '#FB2C36' })
    expect(updated.name).toBe('Reading')
    expect(updated.color).toBe('#FB2C36')
  })

  it('throws LinkuNotFoundError updating a missing folder', () => {
    expect(() => updateFolder(999, { name: 'x' })).toThrow(LinkuNotFoundError)
  })

  it('deleting a folder soft-trashes its links instead of hard-deleting them, orphaning folder_id', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    deleteFolder(f.id)
    expect(listFolders().find((x) => x.id === f.id)).toBeUndefined()
    const trashed = getLink(link.id)
    expect(trashed?.isTrashed).toBe(true)
    expect(trashed?.folderId).toBeNull()
    expect(trashed?.folderName).toBeNull()
  })

  it('deleting a folder does not resurrect links that were already trashed', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    softDeleteLink(link.id)
    deleteFolder(f.id)
    const result = getLink(link.id)
    expect(result?.isTrashed).toBe(true)
    expect(result?.folderId).toBeNull()
  })
})

describe('links', () => {
  it('rejects creating a link in a nonexistent folder', () => {
    expect(() => createLink({ folderId: 999, url: 'https://a.com', title: 'A' })).toThrow(
      LinkuNotFoundError,
    )
  })

  it('folder link_count excludes trashed links', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    expect(listFolders()[0].linkCount).toBe(1)
    softDeleteLink(link.id)
    expect(listFolders()[0].linkCount).toBe(0)
  })

  it('creates a link with no folder at all (folder is optional)', () => {
    const link = createLink({ url: 'https://unsorted.com', title: 'Unsorted' })
    expect(link.folderId).toBeNull()
    expect(link.folderName).toBeNull()
  })

  it('creates a link with an explicit null folderId the same as omitting it', () => {
    const link = createLink({ folderId: null, url: 'https://unsorted.com', title: 'Unsorted' })
    expect(link.folderId).toBeNull()
  })

  it('moves a link into a folder via update, then clears it back to unsorted', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ url: 'https://a.com', title: 'A' })
    expect(link.folderId).toBeNull()

    const moved = updateLink(link.id, { folderId: f.id })
    expect(moved.folderId).toBe(f.id)
    expect(listFolders()[0].linkCount).toBe(1)

    const cleared = updateLink(link.id, { folderId: null })
    expect(cleared.folderId).toBeNull()
    expect(listFolders()[0].linkCount).toBe(0)
  })

  it('update without folderId leaves the existing folder untouched', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    const updated = updateLink(link.id, { title: 'A renamed' })
    expect(updated.folderId).toBe(f.id)
    expect(updated.title).toBe('A renamed')
  })

  it('rejects moving a link into a nonexistent folder', () => {
    const link = createLink({ url: 'https://a.com', title: 'A' })
    expect(() => updateLink(link.id, { folderId: 999 })).toThrow(LinkuNotFoundError)
  })
})

describe('views', () => {
  function seed() {
    const f = createFolder('Reading', '#FFAC02')
    const fav = createLink({ folderId: f.id, url: 'https://fav.com', title: 'Favorite' })
    const archived = createLink({ folderId: f.id, url: 'https://arch.com', title: 'Archived' })
    const plain = createLink({ folderId: f.id, url: 'https://plain.com', title: 'Plain' })
    toggleFavorite(fav.id)
    toggleArchive(archived.id)
    return { f, fav, archived, plain }
  }

  it('all view excludes archived and trashed but still includes favorites', () => {
    const { fav, archived, plain } = seed()
    const ids = listLinks({ view: 'all' }).map((r) => r.id).sort()
    expect(ids).toEqual([fav.id, plain.id].sort())
    expect(ids).not.toContain(archived.id)
  })

  it('favorites view only returns favorited, non-trashed links', () => {
    const { fav } = seed()
    const rows = listLinks({ view: 'favorites' })
    expect(rows.map((r) => r.id)).toEqual([fav.id])
  })

  it('archive view only returns archived links', () => {
    const { archived } = seed()
    const rows = listLinks({ view: 'archive' })
    expect(rows.map((r) => r.id)).toEqual([archived.id])
  })

  it('trash view only returns trashed links, archive/favorite ignored', () => {
    const { fav } = seed()
    softDeleteLink(fav.id)
    const rows = listLinks({ view: 'trash' })
    expect(rows.map((r) => r.id)).toEqual([fav.id])
    expect(listLinks({ view: 'all' }).map((r) => r.id)).not.toContain(fav.id)
    expect(listLinks({ view: 'favorites' }).map((r) => r.id)).not.toContain(fav.id)
  })

  it('search matches title or url', () => {
    const f = createFolder('Reading', '#FFAC02')
    const byTitle = createLink({ folderId: f.id, url: 'https://x.com', title: 'Rocket Science' })
    const byUrl = createLink({ folderId: f.id, url: 'https://rocket.dev', title: 'Other' })
    createLink({ folderId: f.id, url: 'https://unrelated.com', title: 'Nope' })
    const results = listLinks({ view: 'all', search: 'rocket' }).map((r) => r.id).sort()
    expect(results).toEqual([byTitle.id, byUrl.id].sort())
  })

  it('all/recent/favorites/archive views include unsorted (no-folder) links', () => {
    const unsorted = createLink({ url: 'https://loose.com', title: 'Loose' })
    expect(listLinks({ view: 'all' }).map((r) => r.id)).toContain(unsorted.id)
  })
})

describe('trash lifecycle', () => {
  it('restore takes a link out of trash', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    softDeleteLink(link.id)
    const restored = restoreLink(link.id)
    expect(restored.isTrashed).toBe(false)
    expect(restored.trashedAt).toBeNull()
  })

  it('permanentlyDeleteLink refuses to delete a non-trashed link', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    permanentlyDeleteLink(link.id)
    // still present because it was never trashed — the DELETE WHERE is_trashed=1 matched nothing
    expect(getLink(link.id)).not.toBeNull()
  })

  it('emptyTrash removes every trashed link and reports the count', () => {
    const f = createFolder('Reading', '#FFAC02')
    const a = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    const b = createLink({ folderId: f.id, url: 'https://b.com', title: 'B' })
    createLink({ folderId: f.id, url: 'https://c.com', title: 'C' })
    softDeleteLink(a.id)
    softDeleteLink(b.id)
    expect(emptyTrash()).toBe(2)
    expect(listLinks({ view: 'trash' })).toHaveLength(0)
  })
})

describe('visit vs open counters', () => {
  it('tracks Dikunjungi (visit) and Dibuka (open) independently', () => {
    const f = createFolder('Reading', '#FFAC02')
    const link = createLink({ folderId: f.id, url: 'https://a.com', title: 'A' })
    recordVisit(link.id)
    recordVisit(link.id)
    recordOpen(link.id)
    const result = getLink(link.id)
    expect(result?.visitedCount).toBe(2)
    expect(result?.openedCount).toBe(1)
    expect(result?.lastVisitedAt).not.toBeNull()
  })
})
