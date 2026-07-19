import { describe, expect, it } from 'vitest'
import { decodeEntities, parseTitleAndFavicon } from './linku-scrape'

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry')
    expect(decodeEntities('&lt;script&gt;')).toBe('<script>')
    expect(decodeEntities('&quot;quoted&quot;')).toBe('"quoted"')
    expect(decodeEntities("it&#39;s")).toBe("it's")
  })

  it('decodes numeric and hex code points', () => {
    expect(decodeEntities('&#65;&#66;')).toBe('AB')
    expect(decodeEntities('&#x41;&#x42;')).toBe('AB')
  })

  it('leaves unknown entities untouched rather than corrupting them', () => {
    expect(decodeEntities('&madeupentity;')).toBe('&madeupentity;')
  })
})

describe('parseTitleAndFavicon', () => {
  const base = new URL('https://example.com/blog/post')

  it('extracts and decodes the title', () => {
    const html = '<html><head><title>Tom &amp; Jerry — Ep. 1</title></head></html>'
    expect(parseTitleAndFavicon(html, base).title).toBe('Tom & Jerry — Ep. 1')
  })

  it('collapses internal whitespace/newlines in the title', () => {
    const html = '<title>\n  Multi\n  Line   Title \n</title>'
    expect(parseTitleAndFavicon(html, base).title).toBe('Multi Line Title')
  })

  it('falls back to the hostname when no <title> exists', () => {
    const result = parseTitleAndFavicon('<html><head></head></html>', base)
    expect(result.title).toBe('example.com')
  })

  it('resolves a relative favicon href against the page URL', () => {
    const html = '<link rel="icon" href="/static/favicon.png">'
    expect(parseTitleAndFavicon(html, base).faviconUrl).toBe(
      'https://example.com/static/favicon.png',
    )
  })

  it('matches rel/href in either attribute order', () => {
    const html = '<link href="/icon.svg" rel="shortcut icon">'
    expect(parseTitleAndFavicon(html, base).faviconUrl).toBe('https://example.com/icon.svg')
  })

  it('accepts an absolute favicon URL on a different origin (CDN icons)', () => {
    const html = '<link rel="apple-touch-icon" href="https://cdn.example.net/icon-180.png">'
    expect(parseTitleAndFavicon(html, base).faviconUrl).toBe(
      'https://cdn.example.net/icon-180.png',
    )
  })

  it('falls back to /favicon.ico convention when no <link rel=icon> is present', () => {
    const result = parseTitleAndFavicon('<html></html>', base)
    expect(result.faviconUrl).toBe('https://example.com/favicon.ico')
  })
})
