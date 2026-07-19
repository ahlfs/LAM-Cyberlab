import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// These tests process.chdir() into a throwaway directory before every case
// so writeEnvFileValue() never touches the real repo .env (which holds live
// secrets). getEnvPath() inside the module resolves from process.cwd() at
// call time specifically to make this possible.

let originalCwd: string
let tmpDir: string

beforeEach(() => {
  originalCwd = process.cwd()
  tmpDir = mkdtempSync(join(tmpdir(), 'remote-access-config-test-'))
  process.chdir(tmpDir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(tmpDir, { recursive: true, force: true })
  delete process.env.HERMES_PASSWORD
})

describe('readEnvFileValue / writeEnvFileValue', () => {
  it('returns null when .env does not exist', async () => {
    const { readEnvFileValue } = await import('./remote-access-config')
    expect(readEnvFileValue('HOST')).toBeNull()
  })

  it('appends a new key when .env exists but lacks it', async () => {
    writeFileSync('.env', 'FOO=bar\n')
    const { writeEnvFileValue, readEnvFileValue } = await import(
      './remote-access-config'
    )
    writeEnvFileValue('HOST', '0.0.0.0')
    expect(readEnvFileValue('HOST')).toBe('0.0.0.0')
    expect(readFileSync('.env', 'utf8')).toContain('FOO=bar')
  })

  it('creates .env when missing', async () => {
    const { writeEnvFileValue, readEnvFileValue } = await import(
      './remote-access-config'
    )
    writeEnvFileValue('HOST', '0.0.0.0')
    expect(readEnvFileValue('HOST')).toBe('0.0.0.0')
  })

  it('replaces an existing key in place, preserving other lines', async () => {
    writeFileSync('.env', '# comment\nHOST=127.0.0.1\nFOO=bar\n')
    const { writeEnvFileValue, readEnvFileValue } = await import(
      './remote-access-config'
    )
    writeEnvFileValue('HOST', '0.0.0.0')
    const raw = readFileSync('.env', 'utf8')
    expect(raw).toContain('HOST=0.0.0.0')
    expect(raw).not.toContain('HOST=127.0.0.1')
    expect(raw).toContain('# comment')
    expect(raw).toContain('FOO=bar')
    expect(readEnvFileValue('HOST')).toBe('0.0.0.0')
  })

  it('ignores a commented-out key when reading and replacing', async () => {
    writeFileSync('.env', '# HOST=0.0.0.0\nFOO=bar\n')
    const { writeEnvFileValue, readEnvFileValue } = await import(
      './remote-access-config'
    )
    expect(readEnvFileValue('HOST')).toBeNull()
    writeEnvFileValue('HOST', '0.0.0.0')
    const raw = readFileSync('.env', 'utf8')
    // The commented line must survive untouched, and a real assignment gets added.
    expect(raw).toContain('# HOST=0.0.0.0')
    expect(readEnvFileValue('HOST')).toBe('0.0.0.0')
  })

  it('strips surrounding quotes when reading', async () => {
    writeFileSync('.env', 'HERMES_PASSWORD="super secret"\n')
    const { readEnvFileValue } = await import('./remote-access-config')
    expect(readEnvFileValue('HERMES_PASSWORD')).toBe('super secret')
  })
})

describe('getRemoteAccessStatus', () => {
  afterEach(() => {
    delete process.env.HOST
    delete process.env.PORT
  })

  it('reports loopback + no restart needed when disk matches live env', async () => {
    process.env.HOST = '127.0.0.1'
    writeFileSync('.env', 'HOST=127.0.0.1\n')
    const { getRemoteAccessStatus } = await import('./remote-access-config')
    const status = getRemoteAccessStatus()
    expect(status.isExposedLive).toBe(false)
    expect(status.requiresRestart).toBe(false)
  })

  it('flags requiresRestart when disk HOST differs from the live bind', async () => {
    process.env.HOST = '127.0.0.1'
    writeFileSync('.env', 'HOST=0.0.0.0\n')
    const { getRemoteAccessStatus } = await import('./remote-access-config')
    const status = getRemoteAccessStatus()
    expect(status.isExposedLive).toBe(false)
    expect(status.requiresRestart).toBe(true)
  })
})

describe('setWorkspacePassword', () => {
  it('rejects passwords shorter than 8 characters', async () => {
    const { setWorkspacePassword } = await import('./remote-access-config')
    const result = setWorkspacePassword('short')
    expect(result.ok).toBe(false)
  })

  it('persists to .env and applies live immediately', async () => {
    const { setWorkspacePassword, readEnvFileValue } = await import(
      './remote-access-config'
    )
    const result = setWorkspacePassword('a-strong-password')
    expect(result.ok).toBe(true)
    expect(readEnvFileValue('HERMES_PASSWORD')).toBe('a-strong-password')
    expect(process.env.HERMES_PASSWORD).toBe('a-strong-password')
  })
})

describe('setExposeEnabled', () => {
  it('refuses to enable without a configured password', async () => {
    delete process.env.HERMES_PASSWORD
    const { setExposeEnabled } = await import('./remote-access-config')
    const result = setExposeEnabled(true)
    expect(result.ok).toBe(false)
  })

  it('writes HOST=0.0.0.0 once a password is configured', async () => {
    process.env.HERMES_PASSWORD = 'a-strong-password'
    const { setExposeEnabled, readEnvFileValue } = await import(
      './remote-access-config'
    )
    const result = setExposeEnabled(true)
    expect(result.ok).toBe(true)
    expect(readEnvFileValue('HOST')).toBe('0.0.0.0')
  })

  it('writes HOST=127.0.0.1 when disabling', async () => {
    const { setExposeEnabled, readEnvFileValue } = await import(
      './remote-access-config'
    )
    const result = setExposeEnabled(false)
    expect(result.ok).toBe(true)
    expect(readEnvFileValue('HOST')).toBe('127.0.0.1')
  })
})
