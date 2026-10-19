import type { BrowserWindow, IpcMainEvent } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import { installHudToggleShortcut } from './hud-toggle-shortcut'

const input = { type: 'keyDown', key: 'H', meta: true, shift: true, control: false, alt: false }

describe('global HUD shortcut', () => {
  it('owns H once, suppresses the local duplicate, and releases it on rebind or quit', () => {
    const callbacks = new Map<string, () => void>()

    const shortcut = {
      isRegistered: (key: string) => callbacks.has(key),
      register: vi.fn((key: string, callback: () => void) => {
        callbacks.set(key, callback)

        return true
      }),
      unregister: vi.fn((key: string) => void callbacks.delete(key))
    }

    const toggle = vi.fn()
    let listener: ((event: IpcMainEvent, enabled: unknown) => void) | undefined

    const primary = {
      isDestroyed: () => false,
      webContents: {
        mainFrame: {},
        isDestroyed: () => false,
        send: toggle
      }
    } as unknown as BrowserWindow

    let hud: BrowserWindow | null = null
    let running = true
    const getMainWindow = vi.fn((): BrowserWindow | null => primary)
    const close = vi.fn()
    const log = vi.fn()

    const controller = installHudToggleShortcut({
      shortcuts: shortcut,
      ipc: {
        on: vi.fn((_channel, callback) => {
          listener = callback
        })
      },
      getMainWindow,
      getHudWindow: () => hud,
      closeHudWindow: close,
      canToggle: () => running,
      log
    })

    const trusted = { sender: primary.webContents, senderFrame: primary.webContents.mainFrame } as IpcMainEvent
    listener?.({ ...trusted, senderFrame: {} } as IpcMainEvent, true)
    expect(shortcut.register).not.toHaveBeenCalled()
    listener?.(trusted, true)

    expect(callbacks.size).toBe(1)
    callbacks.get('Command+Shift+H')?.()
    expect(toggle).toHaveBeenCalledExactlyOnceWith('hermes:hud:toggle')
    hud = { isDestroyed: () => false } as BrowserWindow
    callbacks.get('Command+Shift+H')?.()
    expect(close).toHaveBeenCalledTimes(1)
    expect(toggle).toHaveBeenCalledTimes(1)
    running = false
    callbacks.get('Command+Shift+H')?.()
    expect(close).toHaveBeenCalledTimes(1)
    running = true
    hud = null
    getMainWindow.mockReturnValue(null)
    callbacks.get('Command+Shift+H')?.()
    expect(toggle).toHaveBeenCalledTimes(1)
    getMainWindow.mockReturnValue(primary)
    expect(controller.claimsInput(input)).toBe(true)
    expect(controller.claimsInput({ ...input, alt: true })).toBe(false)
    listener?.(trusted, false)
    expect(callbacks.size).toBe(0)
    expect(controller.claimsInput(input)).toBe(false)
    controller.apply(true)
    controller.dispose()
    expect(callbacks.size).toBe(0)

    shortcut.register.mockImplementation(() => false)
    listener?.(trusted, true)
    expect(log).toHaveBeenCalledTimes(1)
    expect(controller.claimsInput(input)).toBe(false)
  })
})
