import type { BrowserWindow, IpcMainEvent } from 'electron'

import { createQuickEntryShortcut, type GlobalShortcutLike } from './quick-entry'

interface HudShortcutInput {
  type: string
  key: string
  meta: boolean
  shift: boolean
  control: boolean
  alt: boolean
}

/** macOS HUD chord. Other bindings remain owned by the renderer. */
export function createHudToggleShortcut(shortcuts: GlobalShortcutLike, onToggle: () => void) {
  const controller = createQuickEntryShortcut(shortcuts, onToggle)

  return {
    apply(enabled: boolean): boolean {
      return controller.apply({ enabled, shortcut: 'Command+Shift+H' }).registered
    },
    claimsInput(input: HudShortcutInput): boolean {
      return (
        controller.current().registered &&
        input.type === 'keyDown' &&
        input.key.toLowerCase() === 'h' &&
        input.meta &&
        input.shift &&
        !input.control &&
        !input.alt
      )
    },
    dispose: () => controller.dispose()
  }
}

interface HudToggleShortcutDeps {
  shortcuts: GlobalShortcutLike
  ipc: { on(channel: string, listener: (event: IpcMainEvent, enabled: unknown) => void): void }
  getMainWindow: () => BrowserWindow | null
  getHudWindow: () => BrowserWindow | null
  closeHudWindow: () => void
  canToggle: () => boolean
  log: (message: string) => void
}

/** Main owns registration; primary renderer owns the conversation to open. */
export function installHudToggleShortcut(deps: HudToggleShortcutDeps) {
  const controller = createHudToggleShortcut(deps.shortcuts, () => {
    if (!deps.canToggle()) {
      return
    }

    const hud = deps.getHudWindow()
    const primary = deps.getMainWindow()

    if (hud && !hud.isDestroyed()) {
      deps.closeHudWindow()
    } else if (primary && !primary.isDestroyed() && !primary.webContents.isDestroyed()) {
      primary.webContents.send('hermes:hud:toggle')
    }
  })

  deps.ipc.on('hermes:hud:global-shortcut', (event, enabled) => {
    const primary = deps.getMainWindow()

    if (
      !primary ||
      primary.isDestroyed() ||
      event.sender !== primary.webContents ||
      event.senderFrame !== primary.webContents.mainFrame ||
      !deps.canToggle()
    ) {
      return
    }

    if (!controller.apply(enabled === true) && enabled === true) {
      deps.log('[hud] shortcut Command+Shift+H is unavailable; the in-app binding remains active')
    }
  })

  return controller
}
