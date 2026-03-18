import { describe, it, expect, vi } from 'vitest'

vi.mock('node:child_process', () => {
  const listeners: Record<string, (chunk: Buffer) => void> = {}
  return {
    spawn: () => ({
      stdout: { on: (event: string, cb: (chunk: Buffer) => void) => { listeners[`stdout:${event}`] = cb } },
      stderr: { on: (event: string, cb: (chunk: Buffer) => void) => { listeners[`stderr:${event}`] = cb } },
      _emit: (type: 'stdout' | 'stderr', data: string) => {
        listeners[`${type}:data`]?.(Buffer.from(data))
      }
    })
  }
})

import { startOAuthFlow } from '../openclawManager'

describe('startOAuthFlow', () => {
  it('invokes onUpdate with parsed url and userCode', () => {
    const updates: any[] = []
    const proc: any = startOAuthFlow((payload) => updates.push(payload))
    proc._emit('stdout', 'Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    proc._emit('stdout', 'If prompted, enter the code TEST.')
    expect(updates.at(-1).url).toContain('https://chat.qwen.ai/authorize?user_code=TEST')
    expect(updates.at(-1).userCode).toBe('TEST')
  })
})
