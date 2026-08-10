export type ThemeId =
  | 'claude-nous'
  | 'claude-nous-light'
  | 'matrix'
  | 'matrix-light'
  | 'claude-official'
  | 'claude-official-light'
  | 'claude-classic'
  | 'claude-classic-light'
  | 'claude-slate'
  | 'claude-slate-light'
  | 'scifi'
  | 'scifi-light'
  | 'dracula'
  | 'dracula-light'
  | 'discord-nitro'
  | 'discord-nitro-light'
  | 'arctic'
  | 'arctic-light'
  | 'synthwave'
  | 'synthwave-light'
  | 'biolab'
  | 'biolab-light'
  | 'monokai'
  | 'monokai-light'
  | 'tokyonight'
  | 'tokyonight-light'
  | 'crimson'
  | 'crimson-light'
  | 'deusex'
  | 'deusex-light'
  | 'highcontrast'
  | 'highcontrast-light'

export const THEMES: Array<{
  id: ThemeId
  label: string
  description: string
  icon: string
}> = [
  {
    id: 'dracula',
    label: 'Dracula Soft',
    description: 'Muted Dracula palette, dusk purple on soft charcoal',
    icon: String.fromCodePoint(0x1f987),
  },
  {
    id: 'dracula-light',
    label: 'Dracula Light',
    description: 'Alucard-style cream paper with deep violet accents',
    icon: String.fromCodePoint(0x1f987),
  },
  {
    id: 'discord-nitro',
    label: 'Discord Nitro',
    description: 'Vibrant Blurple and Fuchsia neon on a dark background',
    icon: '✨',
  },
  {
    id: 'discord-nitro-light',
    label: 'Discord Nitro Light',
    description: 'Vibrant Blurple and Fuchsia neon on a white background',
    icon: '✨',
  },
  {
    id: 'claude-nous',
    label: 'Nous',
    description: 'Deep teal background, cream accent — matches Nous Research chrome',
    icon: '◱',
  },
  {
    id: 'claude-nous-light',
    label: 'Nous Light',
    description: 'Cold paper white with restrained cobalt framing',
    icon: '◲',
  },
  {
    id: 'matrix',
    label: 'Matrix',
    description: 'Black glass terminal field with phosphor green signal glow',
    icon: '▣',
  },
  {
    id: 'matrix-light',
    label: 'Matrix Light',
    description: 'White terminal paper with green signal accents',
    icon: '▣',
  },
  {
    id: 'claude-official',
    label: 'Hermes',
    description: 'Navy and indigo flagship theme',
    icon: '⚕',
  },
  {
    id: 'claude-official-light',
    label: 'Hermes Light',
    description: 'Editorial paper white with muted cobalt accents',
    icon: '⚕',
  },
  {
    id: 'claude-classic',
    label: 'Bronze',
    description: 'Bronze accents on dark charcoal',
    icon: '🔶',
  },
  {
    id: 'claude-classic-light',
    label: 'Bronze Light',
    description: 'Warm parchment with bronze accents',
    icon: '🔶',
  },
  {
    id: 'claude-slate',
    label: 'Slate',
    description: 'Cool blue developer theme',
    icon: '🔷',
  },
  {
    id: 'claude-slate-light',
    label: 'Slate Light',
    description: 'GitHub-light palette with blue accents',
    icon: '🔷',
  },
  {
    id: 'scifi',
    label: 'SciFi',
    description: 'Cyberpunk HUD — deep navy, cyan neon, orange highlights',
    icon: '🌌',
  },
  {
    id: 'scifi-light',
    label: 'SciFi Light',
    description: 'Cold steel and teal — cyberpunk interface in daylight',
    icon: '🌌',
  },
  {
    id: 'arctic',
    label: 'Arctic',
    description: 'Deep Space Lab — cold, professional blue',
    icon: '❄️',
  },
  {
    id: 'arctic-light',
    label: 'Arctic Light',
    description: 'Ice white with crisp cool blue accents',
    icon: '❄️',
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Outrun 80s — retro futuristic pink and neon blue',
    icon: '🌅',
  },
  {
    id: 'synthwave-light',
    label: 'Synthwave Light',
    description: 'Bright 80s arcade daylight vibe',
    icon: '🌅',
  },
  {
    id: 'biolab',
    label: 'Biolab',
    description: 'Toxic Hazard — deep dark with intense neon green',
    icon: '☣️',
  },
  {
    id: 'biolab-light',
    label: 'Biolab Light',
    description: 'Sterile white with warning green accents',
    icon: '☣️',
  },
  {
    id: 'monokai',
    label: 'Monokai Pro',
    description: 'Warm dark charcoal with bright, punchy yellow/green',
    icon: '💻',
  },
  {
    id: 'monokai-light',
    label: 'Monokai Light',
    description: 'Warm cream paper with Monokai syntax accents',
    icon: '💻',
  },
  {
    id: 'tokyonight',
    label: 'Tokyo Night',
    description: 'Cyber City — deep purple/blue with neon magenta',
    icon: '🏙️',
  },
  {
    id: 'tokyonight-light',
    label: 'Tokyo Day',
    description: 'Bright city skyline with colorful neon pops',
    icon: '🏙️',
  },
  {
    id: 'crimson',
    label: 'Blood Moon',
    description: 'Offensive Security — pure black and intense crimson',
    icon: '🩸',
  },
  {
    id: 'crimson-light',
    label: 'Crimson Light',
    description: 'Stark white with deep blood red accents',
    icon: '🩸',
  },
  {
    id: 'deusex',
    label: 'Deus Ex',
    description: 'Amber Terminal — dark retro phosphor display',
    icon: '🕶️',
  },
  {
    id: 'deusex-light',
    label: 'Deus Ex Light',
    description: 'Golden paper with amber terminal highlights',
    icon: '🕶️',
  },
  {
    id: 'highcontrast',
    label: 'High Contrast',
    description: 'Pure black & white for maximum focus',
    icon: '👁️',
  },
  {
    id: 'highcontrast-light',
    label: 'High Contrast Light',
    description: 'Pure white & black for maximum focus',
    icon: '👁️',
  },
]

const STORAGE_KEY = 'claude-theme'
const DEFAULT_THEME: ThemeId = 'dracula'
const THEME_SET = new Set<ThemeId>(THEMES.map((theme) => theme.id))
const LIGHT_THEME_MAP: Record<
  Exclude<ThemeId, `${string}-light`>,
  Extract<ThemeId, `${string}-light`>
> = {
  'claude-nous': 'claude-nous-light',
  matrix: 'matrix-light',
  'claude-official': 'claude-official-light',
  'claude-classic': 'claude-classic-light',
  'claude-slate': 'claude-slate-light',
  'scifi': 'scifi-light',
  'dracula': 'dracula-light',
  'discord-nitro': 'discord-nitro-light',
  'arctic': 'arctic-light',
  'synthwave': 'synthwave-light',
  'biolab': 'biolab-light',
  'monokai': 'monokai-light',
  'tokyonight': 'tokyonight-light',
  'crimson': 'crimson-light',
  'deusex': 'deusex-light',
  'highcontrast': 'highcontrast-light',
}
const DARK_THEME_MAP: Record<
  Extract<ThemeId, `${string}-light`>,
  Exclude<ThemeId, `${string}-light`>
> = {
  'claude-nous-light': 'claude-nous',
  'matrix-light': 'matrix',
  'claude-official-light': 'claude-official',
  'claude-classic-light': 'claude-classic',
  'claude-slate-light': 'claude-slate',
  'scifi-light': 'scifi',
  'dracula-light': 'dracula',
  'discord-nitro-light': 'discord-nitro',
  'arctic-light': 'arctic',
  'synthwave-light': 'synthwave',
  'biolab-light': 'biolab',
  'monokai-light': 'monokai',
  'tokyonight-light': 'tokyonight',
  'crimson-light': 'crimson',
  'deusex-light': 'deusex',
  'highcontrast-light': 'highcontrast',
}

const LIGHT_THEMES = new Set<ThemeId>([
  'claude-nous-light',
  'matrix-light',
  'claude-official-light',
  'claude-classic-light',
  'claude-slate-light',
  'scifi-light',
  'dracula-light',
  'discord-nitro-light',
  'arctic-light',
  'synthwave-light',
  'biolab-light',
  'monokai-light',
  'tokyonight-light',
  'crimson-light',
  'deusex-light',
  'highcontrast-light',
])

export function isValidTheme(
  value: string | null | undefined,
): value is ThemeId {
  return typeof value === 'string' && THEME_SET.has(value as ThemeId)
}

export function isDarkTheme(theme: ThemeId): boolean {
  return !LIGHT_THEMES.has(theme)
}

export function getThemeVariant(
  theme: ThemeId,
  mode: 'light' | 'dark',
): ThemeId {
  if (mode === 'light') {
    return isDarkTheme(theme)
      ? LIGHT_THEME_MAP[theme as keyof typeof LIGHT_THEME_MAP]
      : theme
  }

  return isDarkTheme(theme)
    ? theme
    : DARK_THEME_MAP[theme as keyof typeof DARK_THEME_MAP]
}

export function getTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  return isValidTheme(stored) ? stored : DEFAULT_THEME
}

export function setTheme(theme: ThemeId): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove('light', 'dark', 'system')
  const nextMode = isDarkTheme(theme) ? 'dark' : 'light'
  root.classList.add(nextMode)
  root.style.setProperty('color-scheme', nextMode)
  localStorage.setItem(STORAGE_KEY, theme)
}
