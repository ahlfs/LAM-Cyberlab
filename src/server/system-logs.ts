/**
 * Recent system log entries for the System Monitor widget.
 *
 * Sourced from `journalctl -o json`, which requires systemd — absent on
 * Alpine, Void, Devuan, and many containers. Degrades to `null` when the
 * binary is missing or the call fails, matching the rest of this module
 * family's graceful-degradation contract.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type LogEntry = {
  timestampMs: number
  /** syslog priority, 0 (emerg) – 7 (debug); null if journald didn't set one. */
  priority: number | null
  unit: string | null
  message: string
}

type JournalctlLine = {
  __REALTIME_TIMESTAMP?: string
  PRIORITY?: string
  _SYSTEMD_UNIT?: string
  SYSLOG_IDENTIFIER?: string
  MESSAGE?: string | number[]
}

function extractMessage(raw: JournalctlLine['MESSAGE']): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    // Non-UTF8 messages arrive as an array of byte values.
    try {
      return Buffer.from(raw).toString('utf-8')
    } catch {
      return '(binary log message)'
    }
  }
  return ''
}

/** Parses `journalctl -o json` output: one JSON object per line. */
export function parseJournalctlJson(text: string): LogEntry[] {
  const entries: LogEntry[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let parsed: JournalctlLine
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    const microStr = parsed.__REALTIME_TIMESTAMP
    const micro = microStr !== undefined ? Number(microStr) : NaN
    if (!Number.isFinite(micro)) continue
    const priorityNum =
      parsed.PRIORITY !== undefined ? Number(parsed.PRIORITY) : NaN
    entries.push({
      timestampMs: Math.round(micro / 1000),
      priority: Number.isFinite(priorityNum) ? priorityNum : null,
      unit: parsed._SYSTEMD_UNIT ?? parsed.SYSLOG_IDENTIFIER ?? null,
      message: extractMessage(parsed.MESSAGE),
    })
  }
  return entries
}

const DEFAULT_LIMIT = 100

export async function getSystemLogs(
  limit = DEFAULT_LIMIT,
): Promise<LogEntry[] | null> {
  try {
    const { stdout } = await execFileAsync(
      'journalctl',
      [
        '-o',
        'json',
        '-q',
        '--no-pager',
        '-p',
        'warning',
        '-n',
        String(limit),
      ],
      { timeout: 3000, maxBuffer: 10 * 1024 * 1024 },
    )
    // journalctl -n returns oldest-first within the window; flip so the
    // newest entry leads, matching how a log viewer reads.
    return parseJournalctlJson(stdout).reverse()
  } catch {
    return null
  }
}
