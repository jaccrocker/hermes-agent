import type { App, BrowserWindow } from 'electron'

/** Explicit Quick Entry invocation transfers keyboard focus to its panel. */
export function focusQuickEntryWindow(
  window: Pick<BrowserWindow, 'show' | 'focus'>,
  app: Pick<App, 'focus'>,
  isMac: boolean
): void {
  if (isMac) {
    app.focus({ steal: true })
  }

  window.show()
  window.focus()
}
