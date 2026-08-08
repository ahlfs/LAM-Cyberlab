import { describe, expect, it } from 'vitest'

function resolveSessionKeyForSend(input: {
  isPortableMode: boolean
  forcedSessionKey?: string
  existingResolvedSessionKey?: string
  resolvedSessionKey?: string
  activeSessionKey?: string
  activeFriendlyId?: string
}) {
  return input.isPortableMode
    ? 'main'
    : input.forcedSessionKey ||
        input.existingResolvedSessionKey ||
        input.resolvedSessionKey ||
        input.activeSessionKey ||
        input.activeFriendlyId ||
        'main'
}

describe('ChatScreen new-route session reuse', () => {
  it('reuses first resolved session while route is still /chat/new', () => {
    expect(
      resolveSessionKeyForSend({
        isPortableMode: false,
        existingResolvedSessionKey: 'session-1',
        activeFriendlyId: 'new',
      }),
    ).toBe('session-1')
  })
})
