import { beforeEach, describe, expect, it, vi } from 'vitest'
type MockProc = {
  stdout: { on: (event: string, cb: (chunk: Buffer) => void) => void }
  stderr: { on: (event: string, cb: (chunk: Buffer) => void) => void }
  on: (event: 'error' | 'exit', cb: (payload?: unknown) => void) => void
  _emit: (type: 'stdout' | 'stderr', data: string) => void
  _emitEvent: (event: 'error' | 'exit', payload?: unknown) => void
}

const createMockProc = (): MockProc => {
  const listeners: Record<string, (payload?: unknown) => void> = {}

  return {
    stdout: {
      on: (event, cb) => {
        listeners[`stdout:${event}`] = cb
      }
    },
    stderr: {
      on: (event, cb) => {
        listeners[`stderr:${event}`] = cb
      }
    },
    on: (event: 'error' | 'exit', cb) => {
      listeners[`proc:${event}`] = cb
    },
    _emit: (type, data) => {
      listeners[`${type}:data`]?.(Buffer.from(data))
    },
    _emitEvent: (event, payload) => {
      listeners[`proc:${event}`]?.(payload)
    }
  }
}

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => createMockProc())
}))

import { startOAuthFlow } from '../openclawManager'
import { spawn } from 'node:child_process'
const mockSpawn = vi.mocked(spawn)

describe('startOAuthFlow', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
  })

  it('spawns with the expected command, args, and options', () => {
    startOAuthFlow(() => undefined)

    expect(mockSpawn).toHaveBeenCalledTimes(1)
    expect(mockSpawn).toHaveBeenCalledWith(
      'openclaw',
      ['models', 'auth', 'login', '--provider', 'qwen'],
      { stdio: 'pipe' }
    )
  })

  it('passes stdout and stderr chunks through to onUpdate', () => {
    const updates: Array<{ url: string | null; userCode: string | null; error: string | null; chunk: string }> = []
    const proc = startOAuthFlow((payload) => updates.push(payload)) as unknown as MockProc

    proc._emit('stdout', 'Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    proc._emit('stdout', 'If prompted, enter the code TEST.')
    proc._emit('stderr', 'error line')

    expect(updates).toHaveLength(3)
    expect(updates[0].chunk).toBe('Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    expect(updates[1].chunk).toBe('If prompted, enter the code TEST.')
    expect(updates[2].chunk).toBe('error line')
    expect(updates.at(-1)?.url).toContain('https://chat.qwen.ai/authorize?user_code=TEST')
    expect(updates.at(-1)?.userCode).toBe('TEST')
  })

  it('propagates error events via the chunk payload', () => {
    const updates: Array<{ url: string | null; userCode: string | null; error: string | null; chunk: string }> = []
    const proc = startOAuthFlow((payload) => updates.push(payload)) as unknown as MockProc

    proc._emitEvent('error', new Error('boom'))

    expect(updates.at(-1)?.chunk).toBe('boom')
  })

  it('emits an empty chunk on exit', () => {
    const updates: Array<{ url: string | null; userCode: string | null; error: string | null; chunk: string }> = []
    const proc = startOAuthFlow((payload) => updates.push(payload)) as unknown as MockProc

    proc._emitEvent('exit')

    expect(updates.at(-1)?.chunk).toBe('')
  })
})
