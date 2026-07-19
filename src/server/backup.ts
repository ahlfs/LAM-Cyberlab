import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import JSZip from 'jszip'
import { getStateDir } from './workspace-state-dir'
import { getMemoryWorkspaceRoot } from './memory-browser'

/**
 * Workspace backup/restore (Fitur 5).
 *
 * Scope is deliberately narrow — only data that is genuinely "this
 * workspace's own", never hermes-agent secrets or debug artifacts:
 *
 *   - getStateDir() wholesale (Linku DB + favicons, MCP hub sources, and
 *     anything else workspace features store there in the future)
 *   - Memory (MEMORY.md + memory/memories dir) — personal, not a secret
 *   - Skills: only the small per-skill usage/pin preferences file, plus any
 *     skill directory NOT present in the bundled marketplace manifest
 *     (i.e. actually custom/self-authored — the ~2000 bundled skills ship
 *     with hermes-agent itself and don't need backing up)
 *   - .runtime/local-sessions.json + tool-artifacts — the workspace's own
 *     local-only session fallback store (used when no agent gateway is
 *     connected), not the agent's real conversation history
 *   - Browser localStorage settings, passed in by the caller (this module
 *     never touches a browser — the API route collects it from the client)
 *
 * Deliberately EXCLUDED, and not just an oversight:
 *   - ~/.hermes/config.yaml, auth.json — contain provider API keys / auth
 *     tokens. Bundling secrets into a downloadable file is a real leak risk.
 *   - ~/.hermes/sessions/ — this looks like "chat history" by name but is
 *     actually hermes-agent's failed-request debug dump directory, and has
 *     been observed to contain (partially-masked) Authorization headers.
 *   - ~/.hermes/workspace-sessions.json — Remote Access session tokens;
 *     meaningless (and a minor smell) to restore on a different machine.
 *   - ~/.hermes/hooks/, ~/.hermes/cron/ — hermes-agent features, out of
 *     scope for a *workspace* backup (zero-fork boundary).
 *   - The bulk of ~/.hermes/skills/ (the ~9MB bundled catalog itself) —
 *     re-derived from the hermes-agent install, not unique data.
 *   - The agent's own real conversation history (hermes-agent's databases)
 *     — out of scope; reaching into another project's internal DB schema
 *     isn't safe or stable to depend on from here.
 */

export const BACKUP_KIND = 'lam-cyberlab-workspace-backup'
export const BACKUP_VERSION = 1

export type BackupManifest = {
  kind: typeof BACKUP_KIND
  version: number
  createdAt: string
  includes: Array<string>
}

function runtimeDir(): string {
  return join(process.cwd(), '.runtime')
}

/** Recursively add every file under `dirPath` into `zip` at `zipPrefix`. No-op if the dir doesn't exist. */
function addDirToZip(zip: JSZip, zipPrefix: string, dirPath: string): void {
  if (!existsSync(dirPath)) return
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry)
    const stat = statSync(full)
    if (stat.isSymbolicLink()) continue // never follow symlinks into the archive
    if (stat.isDirectory()) {
      addDirToZip(zip, `${zipPrefix}/${entry}`, full)
    } else if (stat.isFile()) {
      zip.file(`${zipPrefix}/${entry}`, readFileSync(full))
    }
  }
}

/** Extract every zip entry under `zipPrefix/` to real files under `destDir`. Rejects any entry that would escape destDir. */
async function extractZipDirToDisk(
  zip: JSZip,
  zipPrefix: string,
  destDir: string,
): Promise<void> {
  const prefix = `${zipPrefix}/`
  const entries = Object.values(zip.files).filter(
    (f) => f.name.startsWith(prefix) && !f.dir,
  )
  for (const entry of entries) {
    const rel = entry.name.slice(prefix.length)
    if (!rel || rel.includes('..') || rel.startsWith('/')) continue // zip-slip guard
    const destPath = join(destDir, rel)
    if (!destPath.startsWith(destDir)) continue // belt and suspenders
    mkdirSync(join(destPath, '..'), { recursive: true })
    const content = await entry.async('nodebuffer')
    writeFileSync(destPath, content)
  }
}

/** Parse `.bundled_manifest` (lines of `skill-id:checksum`) into a set of known bundled skill ids. */
function readBundledSkillIds(skillsDir: string): Set<string> {
  const manifestPath = join(skillsDir, '.bundled_manifest')
  if (!existsSync(manifestPath)) return new Set()
  const raw = readFileSync(manifestPath, 'utf8')
  const ids = new Set<string>()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const colon = trimmed.indexOf(':')
    ids.add(colon === -1 ? trimmed : trimmed.slice(0, colon))
  }
  return ids
}

/** Find skill directories (containing a SKILL.md, up to 3 levels deep) whose id isn't in the bundled manifest. */
function findCustomSkillDirs(skillsDir: string): Array<string> {
  if (!existsSync(skillsDir)) return []
  const bundled = readBundledSkillIds(skillsDir)
  const found: Array<string> = []

  function walk(dir: string, depth: number) {
    if (depth > 3) return
    let entries: Array<string>
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const full = join(dir, entry)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      if (!stat.isDirectory()) continue
      if (existsSync(join(full, 'SKILL.md'))) {
        const id = entry
        if (!bundled.has(id)) found.push(full)
        continue // a skill dir's own subfolders (assets etc.) aren't separate skills
      }
      walk(full, depth + 1)
    }
  }
  walk(skillsDir, 0)
  return found
}

export async function createBackupZip(
  clientSettings: Record<string, string>,
): Promise<Buffer> {
  const zip = new JSZip()
  const includes: Array<string> = []

  addDirToZip(zip, 'workspace', getStateDir())
  includes.push('workspace-state')

  const memRoot = getMemoryWorkspaceRoot()
  const memoryMd = join(memRoot, 'MEMORY.md')
  if (existsSync(memoryMd)) {
    zip.file('memory/MEMORY.md', readFileSync(memoryMd))
    includes.push('memory')
  }
  for (const subdir of ['memory', 'memories']) {
    const full = join(memRoot, subdir)
    if (existsSync(full)) {
      addDirToZip(zip, `memory/${subdir}`, full)
      includes.push('memory')
    }
  }

  const skillsDir = join(memRoot, 'skills')
  const usageFile = join(skillsDir, '.usage.json')
  if (existsSync(usageFile)) {
    zip.file('skills/usage.json', readFileSync(usageFile))
    includes.push('skills-usage')
  }
  const customSkillDirs = findCustomSkillDirs(skillsDir)
  for (const dir of customSkillDirs) {
    const relId = relative(skillsDir, dir)
    addDirToZip(zip, `skills/custom/${relId}`, dir)
  }
  if (customSkillDirs.length > 0) {
    includes.push(`skills-custom:${customSkillDirs.length}`)
  }

  const runtime = runtimeDir()
  const localSessions = join(runtime, 'local-sessions.json')
  if (existsSync(localSessions)) {
    zip.file('runtime/local-sessions.json', readFileSync(localSessions))
    includes.push('local-sessions')
  }
  addDirToZip(zip, 'runtime/tool-artifacts', join(runtime, 'tool-artifacts'))

  if (Object.keys(clientSettings).length > 0) {
    zip.file('settings.json', JSON.stringify(clientSettings, null, 2))
    includes.push('settings')
  }

  const manifest: BackupManifest = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    includes,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export type RestoreResult =
  | { ok: true; settings: Record<string, string>; manifest: BackupManifest }
  | { ok: false; error: string }

export async function restoreBackupZip(buffer: Buffer): Promise<RestoreResult> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return { ok: false, error: 'Not a valid zip file.' }
  }

  const manifestEntry = zip.file('manifest.json')
  if (!manifestEntry) {
    return { ok: false, error: 'Not a Lam Cyberlab backup (missing manifest.json).' }
  }
  let manifest: BackupManifest
  try {
    manifest = JSON.parse(await manifestEntry.async('string'))
  } catch {
    return { ok: false, error: 'manifest.json is corrupt.' }
  }
  if (manifest.kind !== BACKUP_KIND) {
    return { ok: false, error: 'This zip is not a Lam Cyberlab workspace backup.' }
  }
  if (manifest.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Backup was made by a newer version (v${manifest.version}) — update the workspace first.`,
    }
  }

  await extractZipDirToDisk(zip, 'workspace', getStateDir())

  const memRoot = getMemoryWorkspaceRoot()
  const memoryMdEntry = zip.file('memory/MEMORY.md')
  if (memoryMdEntry) {
    writeFileSync(join(memRoot, 'MEMORY.md'), await memoryMdEntry.async('nodebuffer'))
  }
  for (const subdir of ['memory', 'memories']) {
    await extractZipDirToDisk(zip, `memory/${subdir}`, join(memRoot, subdir))
  }

  const skillsDir = join(memRoot, 'skills')
  const usageEntry = zip.file('skills/usage.json')
  if (usageEntry) {
    mkdirSync(skillsDir, { recursive: true })
    writeFileSync(join(skillsDir, '.usage.json'), await usageEntry.async('nodebuffer'))
  }
  await extractZipDirToDisk(zip, 'skills/custom', skillsDir)

  const runtime = runtimeDir()
  const localSessionsEntry = zip.file('runtime/local-sessions.json')
  if (localSessionsEntry) {
    mkdirSync(runtime, { recursive: true })
    writeFileSync(join(runtime, 'local-sessions.json'), await localSessionsEntry.async('nodebuffer'))
  }
  await extractZipDirToDisk(zip, 'runtime/tool-artifacts', join(runtime, 'tool-artifacts'))

  let settings: Record<string, string> = {}
  const settingsEntry = zip.file('settings.json')
  if (settingsEntry) {
    try {
      settings = JSON.parse(await settingsEntry.async('string'))
    } catch {
      settings = {}
    }
  }

  return { ok: true, settings, manifest }
}
