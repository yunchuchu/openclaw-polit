import { beforeEach, describe, expect, it, vi } from 'vitest'
type OAuthUpdate = { url: string | null; userCode: string | null; error: string | null; chunk: string }

type ExitPayload = { exitCode?: number | null }
type MockPty = {
  onData: (cb: (data: string) => void) => void
  onExit: (cb: (payload: ExitPayload) => void) => void
  kill: (signal?: string | number) => void
  _emitData: (data: string) => void
  _emitExit: (code?: number | null) => void
}

const createMockPty = (): MockPty => {
  const listeners: Record<string, (payload?: ExitPayload) => void> = {}

  return {
    onData: (cb) => {
      listeners.data = cb as (payload?: ExitPayload) => void
    },
    onExit: (cb) => {
      listeners.exit = cb
    },
    kill: () => {},
    _emitData: (data) => {
      listeners.data?.(data as unknown as ExitPayload)
    },
    _emitExit: (code) => {
      listeners.exit?.({ exitCode: code })
    }
  }
}

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => createMockPty())
}))

import { startOAuthFlow } from '../openclawManager'
import { spawn as ptySpawn } from 'node-pty'
const mockSpawn = vi.mocked(ptySpawn)

describe('startOAuthFlow', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
  })

  it('spawns with the expected command, args, and options', () => {
    startOAuthFlow(() => undefined)

    expect(mockSpawn).toHaveBeenCalledTimes(1)
    const [cmd, args, options] = mockSpawn.mock.calls[0] ?? []
    expect(cmd).toBe('openclaw')
    expect(args).toEqual(['models', 'auth', 'login', '--provider', 'qwen'])
    expect(options).toEqual(expect.objectContaining({ name: 'xterm-color', cols: 80, rows: 24 }))
  })

  it('passes data chunks through to onUpdate', () => {
    const updates: OAuthUpdate[] = []
    startOAuthFlow((payload) => updates.push(payload))
    const pty = mockSpawn.mock.results[0]?.value as MockPty

    pty._emitData('Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    pty._emitData('If prompted, enter the code TEST.')
    pty._emitData('error line')

    expect(updates).toHaveLength(3)
    expect(updates[0].chunk).toBe('Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    expect(updates[1].chunk).toBe('If prompted, enter the code TEST.')
    expect(updates[2].chunk).toBe('error line')
    expect(updates.at(-1)?.url).toContain('https://chat.qwen.ai/authorize?user_code=TEST')
    expect(updates.at(-1)?.userCode).toBe('TEST')
  })

  it('emits an empty chunk on exit', () => {
    const updates: OAuthUpdate[] = []
    const proc = startOAuthFlow((payload) => updates.push(payload))
    const pty = mockSpawn.mock.results[0]?.value as MockPty
    let exitCode: number | null = null
    proc.on('exit', (code) => {
      exitCode = code
    })
    pty._emitExit(0)
    expect(updates.at(-1)?.chunk).toBe('')
    expect(exitCode).toBe(0)
  })
})
