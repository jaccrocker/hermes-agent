import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { $hudActive, $hudSession } from '@/store/hud'
import { $bindings } from '@/store/keybinds'
import { $activeGatewayProfile } from '@/store/profile'
import { $selectedStoredSessionId, $sessions } from '@/store/session'

import { useHudShortcut } from './use-hud-shortcut'

const originalBridge = window.hermesDesktop
const originalBindings = $bindings.get()

afterEach(() => {
  window.hermesDesktop = originalBridge
  $bindings.set(originalBindings)
  $hudActive.set(false)
  $hudSession.set(null)
  $sessions.set([])
  $selectedStoredSessionId.set(null)
  $activeGatewayProfile.set('default')
})

it('uses the selected session owner, toggles once, and releases H when rebound', () => {
  let toggle: (() => void) | undefined
  const open = vi.fn()
  const close = vi.fn()
  const setGlobalShortcutEnabled = vi.fn()
  const off = vi.fn()
  window.hermesDesktop = {
    hud: {
      open,
      close,
      setGlobalShortcutEnabled,
      onToggle: (callback: () => void) => {
        toggle = callback

        return off
      }
    }
  } as unknown as Window['hermesDesktop']
  $bindings.set({ ...originalBindings, 'view.toggleHud': ['mod+shift+h'] })
  $selectedStoredSessionId.set('chief-chat')
  $sessions.set([{ id: 'chief-chat', profile: 'chief' }] as ReturnType<typeof $sessions.get>)
  $activeGatewayProfile.set('default')
  $hudActive.set(false)

  const { unmount } = renderHook(() => useHudShortcut())
  expect(setGlobalShortcutEnabled).toHaveBeenLastCalledWith(true)
  act(() => toggle?.())
  expect(open).toHaveBeenCalledExactlyOnceWith({ sessionId: 'chief-chat', profile: 'chief' })
  act(() => toggle?.())
  expect(close).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledTimes(1)
  act(() => $bindings.set({ ...$bindings.get(), 'view.toggleHud': ['mod+shift+j'] }))
  expect(setGlobalShortcutEnabled).toHaveBeenLastCalledWith(false)
  unmount()
  expect(off).toHaveBeenCalledTimes(1)
})
