import { expect, it, vi } from 'vitest'

import { focusQuickEntryWindow } from './quick-entry-window-focus'

it('activates Hermes before showing a macOS panel invoked from another app', () => {
  let appActive = false
  let visible = false
  let focused = false

  const app = {
    focus: vi.fn(({ steal }: { steal: boolean }) => {
      appActive = steal
    })
  }

  const panel = {
    show: () => {
      visible = true
    },
    focus: () => {
      // A nonactivating panel cannot retain focus while the previous app owns it.
      focused = appActive

      if (!focused) {
        visible = false
      }
    }
  }

  focusQuickEntryWindow(panel, app, true)
  expect(app.focus).toHaveBeenCalledExactlyOnceWith({ steal: true })
  expect(visible).toBe(true)
  expect(focused).toBe(true)
})

it('keeps Windows and Linux on window focus without app activation', () => {
  const app = { focus: vi.fn() }
  const panel = { show: vi.fn(), focus: vi.fn() }

  focusQuickEntryWindow(panel, app, false)
  expect(app.focus).not.toHaveBeenCalled()
  expect(panel.show).toHaveBeenCalledTimes(1)
  expect(panel.focus).toHaveBeenCalledTimes(1)
})
