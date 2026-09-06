import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { extname, join } from 'node:path'

const DATA_DIR = join(process.cwd(), '.runtime')
const ATTACHMENTS_DIR = join(DATA_DIR, 'attachments')
const INDEX_FILE = join(DATA_DIR, 'attachments-index.json')

export type StoredAttachment = {
  id: string
  hash: string
  fileName: string
  contentType: string
  size: number
  storagePath: string
  url: string
  sessionId?: string
  createdAt: number
}

type AttachmentIndex = {
  attachments: Record<string, StoredAttachment>
  sessionAttachments: Record<string, Array<string>> // sessionId -> Array of attachment IDs
}

let index: AttachmentIndex = {
  attachments: {},
  sessionAttachments: {},
}

function loadIndex(): void {
  try {
    if (existsSync(INDEX_FILE)) {
      const raw = readFileSync(INDEX_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as AttachmentIndex
      if (parsed.attachments && parsed.sessionAttachments) {
        index = parsed
      }
    }
  } catch {
    // ignore corrupt index
  }
}

function saveIndex(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
  } catch {
    // ignore index save failure
  }
}

function ensureAttachmentsDir(): void {
  if (!existsSync(ATTACHMENTS_DIR)) {
    mkdirSync(ATTACHMENTS_DIR, { recursive: true })
  }
}

loadIndex()

function getExtensionForContentType(contentType: string, fileName = ''): string {
  const fromName = extname(fileName).toLowerCase()
  if (fromName && fromName.length > 1) return fromName

  const mime = contentType.toLowerCase()
  if (mime.includes('png')) return '.png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('gif')) return '.gif'
  if (mime.includes('svg')) return '.svg'
  if (mime.includes('bmp')) return '.bmp'
  if (mime.includes('pdf')) return '.pdf'
  if (mime.includes('json')) return '.json'
  if (mime.includes('markdown') || mime.includes('md')) return '.md'
  if (mime.includes('text')) return '.txt'
  return '.bin'
}

/**
 * Save an attachment to server-side storage with SHA-256 deduplication.
 */
export function saveAttachment(
  data: Buffer | string, // Buffer or base64 string
  options: {
    id?: string
    fileName?: string
    contentType?: string
    sessionId?: string
  } = {},
): StoredAttachment {
  ensureAttachmentsDir()

  let buffer: Buffer
  if (typeof data === 'string') {
    let clean = data.trim()
    if (clean.startsWith('data:')) {
      const comma = clean.indexOf(',')
      if (comma >= 0) {
        clean = clean.slice(comma + 1)
      }
    }
    buffer = Buffer.from(clean, 'base64')
  } else {
    buffer = data
  }

  const hash = createHash('sha256').update(buffer).digest('hex')
  const ext = getExtensionForContentType(
    options.contentType || 'application/octet-stream',
    options.fileName || '',
  )
  const diskFileName = `${hash}${ext}`
  const diskPath = join(ATTACHMENTS_DIR, diskFileName)

  // Write file to disk if not exists (SHA-256 dedup)
  if (!existsSync(diskPath)) {
    writeFileSync(diskPath, buffer)
  }

  const id = options.id || crypto.randomUUID()
  const stored: StoredAttachment = {
    id,
    hash,
    fileName: options.fileName || diskFileName,
    contentType: options.contentType || 'application/octet-stream',
    size: buffer.length,
    storagePath: diskPath,
    url: `/api/attachments?id=${encodeURIComponent(id)}`,
    sessionId: options.sessionId,
    createdAt: Date.now(),
  }

  index.attachments[id] = stored

  if (options.sessionId) {
    const sessionList = index.sessionAttachments[options.sessionId] || []
    if (!sessionList.includes(id)) {
      sessionList.push(id)
      index.sessionAttachments[options.sessionId] = sessionList
    }
  }

  saveIndex()
  return stored
}

export function getAttachmentById(id: string): StoredAttachment | null {
  return index.attachments[id] ?? null
}

export function getAttachmentFileStreamOrBuffer(
  id: string,
): { buffer: Buffer; meta: StoredAttachment } | null {
  const meta = index.attachments[id]
  if (!meta || !existsSync(meta.storagePath)) return null
  try {
    const buffer = readFileSync(meta.storagePath)
    return { buffer, meta }
  } catch {
    return null
  }
}

export function getAttachmentsForSession(sessionId: string): Array<StoredAttachment> {
  const ids = index.sessionAttachments[sessionId] || []
  return ids
    .map((id) => index.attachments[id])
    .filter((att): att is StoredAttachment => Boolean(att))
}

/**
 * Cascade deletion: Remove attachments associated with a deleted session.
 * If no other session or reference uses the physical file, delete it from disk.
 */
export function deleteAttachmentsForSession(sessionId: string): void {
  const ids = index.sessionAttachments[sessionId] || []
  if (ids.length === 0) return

  delete index.sessionAttachments[sessionId]

  for (const id of ids) {
    const att = index.attachments[id]
    if (!att) continue
    delete index.attachments[id]

    // Check if any remaining attachment references the same hash
    const isHashStillUsed = Object.values(index.attachments).some(
      (other) => other.hash === att.hash,
    )

    if (!isHashStillUsed && existsSync(att.storagePath)) {
      try {
        unlinkSync(att.storagePath)
      } catch {
        // ignore deletion error
      }
    }
  }

  saveIndex()
}
