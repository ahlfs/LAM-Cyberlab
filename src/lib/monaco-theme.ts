import type { Monaco } from '@monaco-editor/react'
import type { ThemeId } from '@/lib/theme'

export function defineMonacoThemes(monaco: Monaco) {
  // 1. Minimalist Dark
  monaco.editor.defineTheme('lam-minimalist-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a8f98', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7170ff', fontStyle: 'bold' },
      { token: 'string', foreground: '50fa7b' },
      { token: 'number', foreground: 'ffb86c' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'function', foreground: 'bd93f9' },
      { token: 'variable', foreground: 'f7f8f8' },
    ],
    colors: {
      'editor.background': '#08090a',
      'editor.foreground': '#f7f8f8',
      'editor.lineHighlightBackground': '#0d0e11',
      'editor.lineHighlightBorder': '#ffffff0a',
      'editorLineNumber.foreground': '#8a8f9855',
      'editorLineNumber.activeForeground': '#7170ff',
      'editorGutter.background': '#08090a',
      'editor.selectionBackground': '#5e6ad23d',
      'editor.inactiveSelectionBackground': '#5e6ad220',
      'editorCursor.foreground': '#7170ff',
      'editorWhitespace.foreground': '#ffffff10',
      'editorIndentGuide.background1': '#ffffff08',
      'editorIndentGuide.activeBackground1': '#5e6ad240',
      'editorBracketMatch.background': '#5e6ad225',
      'editorBracketMatch.border': '#7170ff60',
    },
  })

  // 2. Minimalist Light
  monaco.editor.defineTheme('lam-minimalist-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: '5e6ad2', fontStyle: 'bold' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '22863a' },
      { token: 'function', foreground: '6f42c1' },
      { token: 'variable', foreground: '24292e' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.lineHighlightBorder': '#00000008',
      'editorLineNumber.foreground': '#959da588',
      'editorLineNumber.activeForeground': '#5e6ad2',
      'editorGutter.background': '#ffffff',
      'editor.selectionBackground': '#5e6ad225',
      'editor.inactiveSelectionBackground': '#5e6ad212',
      'editorCursor.foreground': '#5e6ad2',
      'editorWhitespace.foreground': '#00000010',
      'editorIndentGuide.background1': '#00000010',
      'editorIndentGuide.activeBackground1': '#5e6ad250',
      'editorBracketMatch.background': '#5e6ad218',
      'editorBracketMatch.border': '#5e6ad250',
    },
  })

  // 3. Dracula Soft Dark
  monaco.editor.defineTheme('lam-dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a40',
      'editor.lineHighlightBorder': '#44475a00',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editorGutter.background': '#282a36',
      'editor.selectionBackground': '#44475a80',
      'editor.inactiveSelectionBackground': '#44475a40',
      'editorCursor.foreground': '#ae81ff',
      'editorWhitespace.foreground': '#6272a440',
      'editorIndentGuide.background1': '#44475a50',
      'editorIndentGuide.activeBackground1': '#bd93f980',
      'editorBracketMatch.background': '#bd93f930',
      'editorBracketMatch.border': '#bd93f980',
    },
  })

  // 4. Dracula Light (Alucard)
  monaco.editor.defineTheme('lam-dracula-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6c664b', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a3144d', fontStyle: 'bold' },
      { token: 'string', foreground: '644ac9' },
      { token: 'number', foreground: '8a3b14' },
      { token: 'type', foreground: '18635b' },
      { token: 'function', foreground: '644ac9' },
      { token: 'variable', foreground: '1f1f1f' },
    ],
    colors: {
      'editor.background': '#fffbeb',
      'editor.foreground': '#1f1f1f',
      'editor.lineHighlightBackground': '#f6f0da',
      'editor.lineHighlightBorder': '#ddd6bd40',
      'editorLineNumber.foreground': '#6c664b88',
      'editorLineNumber.activeForeground': '#644ac9',
      'editorGutter.background': '#fffbeb',
      'editor.selectionBackground': '#644ac920',
      'editor.inactiveSelectionBackground': '#644ac910',
      'editorCursor.foreground': '#644ac9',
      'editorWhitespace.foreground': '#6c664b25',
      'editorIndentGuide.background1': '#ddd6bd80',
      'editorIndentGuide.activeBackground1': '#644ac960',
      'editorBracketMatch.background': '#644ac918',
      'editorBracketMatch.border': '#644ac950',
    },
  })
}

export function resolveMonacoTheme(themeId: ThemeId): string {
  if (themeId === 'dark-minimalist') return 'lam-minimalist-dark'
  if (themeId === 'dark-minimalist-light') return 'lam-minimalist-light'
  if (themeId === 'dracula') return 'lam-dracula'
  if (themeId === 'dracula-light') return 'lam-dracula-light'

  // Generic fallback: check if light or dark
  return themeId.endsWith('-light') ? 'vs' : 'vs-dark'
}
