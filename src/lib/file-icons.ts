export const EXT_ICON_MAP: Record<string, string> = {
  '.js': 'devicon-javascript-plain colored',
  '.mjs': 'devicon-javascript-plain colored',
  '.jsx': 'devicon-react-original colored',
  '.ts': 'devicon-typescript-plain colored',
  '.tsx': 'devicon-react-original colored',
  '.py': 'devicon-python-plain colored',
  '.rs': 'devicon-rust-original',
  '.go': 'devicon-go-original-wordmark colored',
  '.html': 'devicon-html5-plain colored',
  '.css': 'devicon-css3-plain colored',
  '.scss': 'devicon-sass-original colored',
  '.json': 'devicon-nodejs-plain colored',
  '.md': 'devicon-markdown-original',
  '.yaml': 'devicon-yaml-plain colored',
  '.yml': 'devicon-yaml-plain colored',
  '.toml': 'devicon-rust-original',
  '.sh': 'devicon-bash-plain',
  '.bash': 'devicon-bash-plain',
  '.vue': 'devicon-vuejs-plain colored',
  '.svelte': 'devicon-svelte-plain colored',
  '.php': 'devicon-php-plain colored',
  '.rb': 'devicon-ruby-plain colored',
  '.java': 'devicon-java-plain colored',
  '.kt': 'devicon-kotlin-plain colored',
  '.swift': 'devicon-swift-plain colored',
  '.dart': 'devicon-dart-plain colored',
  '.lua': 'devicon-lua-plain colored',
  '.sql': 'devicon-postgresql-plain colored',
  '.docker': 'devicon-docker-plain colored',
  '.dockerfile': 'devicon-docker-plain colored',
  '.gitignore': 'devicon-git-plain colored',
  '.zip': 'devicon-zip-plain',
  '.tar': 'devicon-zip-plain',
  '.gz': 'devicon-zip-plain',
}

export function getFileIconClass(name: string): string | null {
  const lower = name.toLowerCase()
  // Check special filenames
  if (lower === 'dockerfile' || lower === 'docker-compose.yml' || lower === 'docker-compose.yaml') {
    return 'devicon-docker-plain colored'
  }
  if (lower === 'package.json' || lower === 'package-lock.json') {
    return 'devicon-npm-original-wordmark colored'
  }
  if (lower === '.gitignore' || lower === '.gitmodules') {
    return 'devicon-git-plain colored'
  }
  // Check extension
  const dotIdx = lower.lastIndexOf('.')
  if (dotIdx >= 0) {
    const ext = lower.slice(dotIdx)
    return EXT_ICON_MAP[ext] ?? null
  }
  return null
}
