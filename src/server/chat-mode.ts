import { getChatMode } from './gateway-capabilities'

export type { ChatMode } from './gateway-capabilities'

export type ChatBackend = 'claude-enhanced' | 'openai-compat' | 'none'

export function resolveChatBackend(): ChatBackend {
  const mode = getChatMode()
  if (mode === 'enhanced-claude') return 'claude-enhanced'
  if (mode === 'portable' || mode === 'responses') return 'openai-compat'
  return 'none'
}
