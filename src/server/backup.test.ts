import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Full isolation from the real ~/.hermes: HERMES_HOME + HERMES_WORKSPACE_STATE_DIR
// point at a throwaway tmp tree, and process.chdir() covers the cwd-relative
// .runtime dir. Nothing here ever touches real user data.

let originalCwd: string
let root: string
let hermesHome: string
let stateDir: string

beforeEach(() => {
  originalCwd = process.cwd()
  root = mkdtempSync(join(tmpdir(), 'backup-test-'))
  hermesHome = join(root, 'hermes-home')
  stateDir = join(root, 'workspace-state')
  mkdirSync(hermesHome, { recursive: true })
  mkdirSync(stateDir, { recursive: true })
  process.env.HERMES_HOME = hermesHome
  process.env.HERMES_WORKSPACE_STATE_DIR = stateDir
  process.chdir(root)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(root, { recursive: true, force: true })
  delete process.env.HERMES_HOME
  delete process.env.HERMES_WORKSPACE_STATE_DIR
})

describe('createBackupZip / restoreBackupZip round trip', () => {
  it('carries workspace state, memory, skill usage, custom skills, local sessions, and settings through', async () => {
    // Workspace state (Linku-like)
    mkdirSync(join(stateDir, 'linku'), { recursive: true })
    writeFileSync(join(stateDir, 'linku', 'linku.db'), 'fake-sqlite-bytes')
    writeFileSync(join(stateDir, 'mcp-hub-sources.json'), '{"sources":[]}')

    // Memory
    writeFileSync(join(hermesHome, 'MEMORY.md'), '# Memory\n- fact one')
    mkdirSync(join(hermesHome, 'memories'), { recursive: true })
    writeFileSync(join(hermesHome, 'memories', '2026-07-19.md'), 'daily note')

    // Skills: one bundled (excluded), one custom (included)
    const skillsDir = join(hermesHome, 'skills')
    mkdirSync(join(skillsDir, 'bundled-one'), { recursive: true })
    writeFileSync(join(skillsDir, 'bundled-one', 'SKILL.md'), 'bundled skill body')
    mkdirSync(join(skillsDir, 'my-custom-skill'), { recursive: true })
    writeFileSync(join(skillsDir, 'my-custom-skill', 'SKILL.md'), 'custom skill body')
    writeFileSync(join(skillsDir, '.bundled_manifest'), 'bundled-one:abc123\n')
    writeFileSync(join(skillsDir, '.usage.json'), '{"bundled-one":{"pinned":true}}')

    // Local sessions
    mkdirSync(join(root, '.runtime'), { recursive: true })
    writeFileSync(join(root, '.runtime', 'local-sessions.json'), '{"new":{"title":"hi"}}')

    const zipBuffer = await import('./backup').then((m) =>
      m.createBackupZip({ 'claude-settings': '{"theme":"dark"}' }),
    )

    // Wipe everything and restore into fresh (still isolated) locations
    rmSync(stateDir, { recursive: true, force: true })
    rmSync(hermesHome, { recursive: true, force: true })
    rmSync(join(root, '.runtime'), { recursive: true, force: true })
    mkdirSync(stateDir, { recursive: true })
    mkdirSync(hermesHome, { recursive: true })

    const { restoreBackupZip } = await import('./backup')
    const result = await restoreBackupZip(zipBuffer)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.settings).toEqual({ 'claude-settings': '{"theme":"dark"}' })
    expect(readFileSync(join(stateDir, 'linku', 'linku.db'), 'utf8')).toBe(
      'fake-sqlite-bytes',
    )
    expect(readFileSync(join(stateDir, 'mcp-hub-sources.json'), 'utf8')).toBe(
      '{"sources":[]}',
    )
    expect(readFileSync(join(hermesHome, 'MEMORY.md'), 'utf8')).toBe(
      '# Memory\n- fact one',
    )
    expect(
      readFileSync(join(hermesHome, 'memories', '2026-07-19.md'), 'utf8'),
    ).toBe('daily note')
    expect(
      readFileSync(join(hermesHome, 'skills', '.usage.json'), 'utf8'),
    ).toBe('{"bundled-one":{"pinned":true}}')
    expect(
      readFileSync(
        join(hermesHome, 'skills', 'my-custom-skill', 'SKILL.md'),
        'utf8',
      ),
    ).toBe('custom skill body')
    // The bundled skill's content itself must NOT have been backed up.
    expect(
      existsSyncSafe(join(hermesHome, 'skills', 'bundled-one', 'SKILL.md')),
    ).toBe(false)
    expect(
      readFileSync(join(root, '.runtime', 'local-sessions.json'), 'utf8'),
    ).toBe('{"new":{"title":"hi"}}')
  })

  it('excludes sensitive agent files even if present alongside workspace data', async () => {
    // These live in the same HERMES_HOME but must never be read/zipped by backup.ts.
    writeFileSync(join(hermesHome, 'config.yaml'), 'anthropic_api_key: sk-should-not-leak')
    writeFileSync(join(hermesHome, 'auth.json'), '{"token":"should-not-leak"}')
    mkdirSync(join(hermesHome, 'sessions'), { recursive: true })
    writeFileSync(
      join(hermesHome, 'sessions', 'request_dump.json'),
      '{"headers":{"Authorization":"Bearer should-not-leak"}}',
    )
    writeFileSync(join(hermesHome, 'workspace-sessions.json'), '{"token":"should-not-leak"}')

    const { createBackupZip } = await import('./backup')
    const zipBuffer = await createBackupZip({})

    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(zipBuffer)
    const allText = (
      await Promise.all(
        Object.values(zip.files)
          .filter((f) => !f.dir)
          .map((f) => f.async('string')),
      )
    ).join('\n')

    expect(allText).not.toContain('should-not-leak')
  })
})

describe('restoreBackupZip validation', () => {
  it('rejects a non-zip buffer', async () => {
    const { restoreBackupZip } = await import('./backup')
    const result = await restoreBackupZip(Buffer.from('not a zip'))
    expect(result.ok).toBe(false)
  })

  it('rejects a zip with no manifest.json', async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file('hello.txt', 'world')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const { restoreBackupZip } = await import('./backup')
    const result = await restoreBackupZip(buffer)
    expect(result.ok).toBe(false)
  })

  it('rejects a manifest with the wrong kind', async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify({ kind: 'something-else', version: 1 }))
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const { restoreBackupZip } = await import('./backup')
    const result = await restoreBackupZip(buffer)
    expect(result.ok).toBe(false)
  })

  it('rejects a manifest from a newer backup version', async () => {
    const { BACKUP_KIND } = await import('./backup')
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file(
      'manifest.json',
      JSON.stringify({ kind: BACKUP_KIND, version: 999, createdAt: '', includes: [] }),
    )
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const { restoreBackupZip } = await import('./backup')
    const result = await restoreBackupZip(buffer)
    expect(result.ok).toBe(false)
  })
})

function existsSyncSafe(path: string): boolean {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
