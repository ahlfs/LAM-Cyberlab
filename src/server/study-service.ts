import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export type ExtractedDocResult = {
  title: string
  content: string
  sourceUrl?: string
  size: number
}

export function getObsidianVaultDir(): string {
  if (process.env.OBSIDIAN_VAULT_DIR) {
    return path.resolve(process.env.OBSIDIAN_VAULT_DIR)
  }
  return path.join(os.homedir(), 'obsidian', 'memo')
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'untitled-note'
}

function cleanHtmlToMarkdown(html: string): { title: string; content: string } {
  let title = 'Web Article'
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim()
  }

  // Remove scripts, styles, svg, and navigations
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')

  // Basic HTML tag to text/markdown converter
  cleaned = cleaned
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, '\n#### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ') // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()

  return { title, content: cleaned }
}

export async function extractContentFromUrl(url: string): Promise<ExtractedDocResult> {
  const parsedUrl = new URL(url)
  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status} ${response.statusText})`)
  }

  const rawHtml = await response.text()
  const { title, content } = cleanHtmlToMarkdown(rawHtml)

  return {
    title,
    content,
    sourceUrl: url,
    size: Buffer.byteLength(content, 'utf-8'),
  }
}

export async function extractContentFromFile(file: {
  name: string
  buffer: Buffer
  mimeType: string
}): Promise<ExtractedDocResult> {
  const ext = path.extname(file.name).toLowerCase()
  const baseName = path.basename(file.name, ext)

  let content = ''
  if (ext === '.md' || ext === '.txt' || file.mimeType.startsWith('text/')) {
    content = file.buffer.toString('utf-8')
  } else if (ext === '.json') {
    content = '```json\n' + file.buffer.toString('utf-8') + '\n```'
  } else {
    // For binary docs (like PDF/DOCX or others), extract readable text strings cleanly
    const rawString = file.buffer.toString('utf-8')
    content = rawString.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return {
    title: baseName,
    content,
    size: file.buffer.length,
  }
}

export async function commitToSecondBrain(
  payload: {
    title: string
    content: string
    tags: string[]
    sourceUrl?: string
  },
  options: { skipSyncExecution?: boolean } = {},
): Promise<{ success: boolean; filePath: string; syncOutput: string }> {
  const vaultDir = getObsidianVaultDir()
  const targetDir = path.join(vaultDir, '03-Notes', 'Extracted-Docs')

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const slug = sanitizeFileName(payload.title)
  const today = new Date().toISOString().split('T')[0]
  const fileName = `${today}-${slug}.md`
  const fullPath = path.join(targetDir, fileName)

  const frontmatter = [
    '---',
    `title: ${payload.title}`,
    `created: ${today}`,
    `tags: [${payload.tags.join(', ')}]`,
    ...(payload.sourceUrl ? [`source: "${payload.sourceUrl}"`] : []),
    'type: study-extracted-doc',
    '---',
    '',
    payload.content,
  ].join('\n')

  fs.writeFileSync(fullPath, frontmatter, 'utf-8')

  let syncOutput = ''
  if (!options.skipSyncExecution) {
    const syncScript = path.join(
      os.homedir(),
      '.hermes',
      'hermes-agent',
      'scripts',
      'second-brain',
      'sync-second-brain.sh',
    )
    if (fs.existsSync(syncScript)) {
      try {
        const { stdout } = await execAsync(`bash "${syncScript}"`)
        syncOutput = stdout
      } catch (err: any) {
        syncOutput = `Sync script finished with notice: ${err?.message || String(err)}`
      }
    }
  }

  return {
    success: true,
    filePath: fullPath,
    syncOutput,
  }
}
