/**
 * Server-side title + favicon scraper for the Linku "paste a URL" flow.
 * Deliberately minimal (regex over raw HTML, no DOM parser dependency):
 * this only needs a reasonable best-effort title/icon, and the brief
 * requires the result stay editable inline in the client either way.
 */

const FETCH_TIMEOUT_MS = 8000
const MAX_HTML_BYTES = 2_000_000

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const codePoint =
        code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? match
  })
}

export type ScrapeResult = { title: string; faviconUrl: string | null }

/** Pure HTML parsing, split out from the fetch so it's unit-testable without network mocking. */
export function parseTitleAndFavicon(html: string, baseUrl: URL): ScrapeResult {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch
    ? decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim())
    : baseUrl.hostname

  const iconMatch =
    html.match(
      /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i,
    ) ??
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i,
    )

  let faviconUrl: string | null
  try {
    faviconUrl = new URL(iconMatch ? iconMatch[1] : '/favicon.ico', baseUrl).toString()
  } catch {
    faviconUrl = null
  }

  return { title: title || baseUrl.hostname, faviconUrl }
}

export async function scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
  const target = new URL(rawUrl)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Only http/https URLs are supported')
  }

  const res = await fetch(target, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LinkuBot/1.0; +link-preview)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`)

  const reader = res.body?.getReader()
  let html = ''
  if (reader) {
    const decoder = new TextDecoder()
    let bytes = 0
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      html += decoder.decode(value, { stream: true })
    }
    await reader.cancel().catch(() => {})
  } else {
    html = await res.text()
  }

  return parseTitleAndFavicon(html, target)
}
