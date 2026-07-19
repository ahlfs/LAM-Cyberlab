/**
 * Fixed categorical palette for folder tabs — deliberately independent
 * of `--theme-accent` (that's the app's one signal color, reserved for
 * actions/selection per DESIGN.md's One Lantern Rule). Folder colors
 * are the user's own categorization system, so they stay vivid and
 * fixed across every theme rather than deriving from theme tokens.
 */
export const FOLDER_COLORS = [
  { name: 'Amber', hex: '#F5A524' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Slate', hex: '#64748B' },
] as const

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].hex
