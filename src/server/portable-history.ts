export type PortableHistoryMessage = {
  role: string
  content: string
}

export function shouldReplayPortableHistory(options?: {
  localBaseUrl?: string
  bearerToken?: string
}): boolean {
  // Always replay the local transcript.  The gateway's _run_agent creates
  // internal child sessions (via conversation compression) that do NOT
  // reliably preserve history under the session ID we send.  Without
  // replaying, the model sees no prior context and every message looks
  // like the first in a new conversation.
  return true
}

export function selectPortableConversationHistory(
  persistedHistory: Array<PortableHistoryMessage>,
  fallbackHistory: Array<PortableHistoryMessage>,
  options?: {
    localBaseUrl?: string
    bearerToken?: string
  },
): Array<PortableHistoryMessage> {
  if (!shouldReplayPortableHistory(options)) return []
  return persistedHistory.length > 0 ? persistedHistory : fallbackHistory
}
